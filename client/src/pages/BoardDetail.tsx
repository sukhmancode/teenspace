import { useEffect, useState, useRef, useMemo } from "react";
import { Excalidraw, serializeAsJSON } from "@excalidraw/excalidraw";
import { useParams, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, ArrowLeft, Save, Share2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function BoardDetail() {
    const { id } = useParams();
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
    const socketRef = useRef<WebSocket | null>(null);
    const isRemoteUpdate = useRef(false);
    const elementsRef = useRef<readonly any[]>([]);
    const appStateRef = useRef<any>({});

    const { data: board, isLoading } = useQuery({
        queryKey: [`/api/boards/${id}`],
        queryFn: async () => {
            const res = await fetch(`/api/boards/${id}`);
            if (!res.ok) throw new Error("Failed to fetch board details");
            return res.json();
        }
    });

    const saveMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await fetch(`/api/boards/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error("Failed to save board");
            return res.json();
        },
        onSuccess: () => {
            toast({ title: "Board Saved", description: "Your progress has been preserved." });
            queryClient.invalidateQueries({ queryKey: [`/api/boards/${id}`] });
        }
    });

    useEffect(() => {
        if (!user || !id || !excalidrawAPI) return;

        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        const socket = new WebSocket(wsUrl);
        socketRef.current = socket;

        socket.onopen = () => {
            socket.send(JSON.stringify({ type: 'auth', userId: user.id }));
            socket.send(JSON.stringify({ type: 'join-board', boardId: id }));
        };

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'board-update' && excalidrawAPI) {
                isRemoteUpdate.current = true;
                excalidrawAPI.updateScene({
                    elements: data.elements,
                    appState: data.appState,
                    commitToHistory: false
                });

                // Update refs to avoid local echo
                elementsRef.current = data.elements;
                appStateRef.current = data.appState;
            }
        };

        return () => {
            socket.close();
            socketRef.current = null;
        };
    }, [user, id, excalidrawAPI]);

    const onChange = (elements: readonly any[], appState: any) => {
        // Basic throttling would be nice, but let's keep it simple
        if (isRemoteUpdate.current) {
            isRemoteUpdate.current = false;
            return;
        }

        if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({
                type: 'board-update',
                elements,
                appState
            }));
        }

        elementsRef.current = elements;
        appStateRef.current = appState;
    };

    const handleSave = () => {
        if (!excalidrawAPI) return;
        const elements = excalidrawAPI.getSceneElements();
        const appState = excalidrawAPI.getAppState();

        saveMutation.mutate({
            elements: JSON.stringify(elements),
            appState: JSON.stringify(appState)
        });
    };

    const handleCopyUrl = () => {
        navigator.clipboard.writeText(window.location.href);
        toast({ title: "Link Copied", description: "Share this URL with anyone to collaborate!" });
    };

    const initialData = useMemo(() => {
        if (!board) return null;
        try {
            return {
                elements: board.elements ? JSON.parse(board.elements) : [],
                appState: board.appState ? JSON.parse(board.appState) : {},
                scrollToContent: true
            };
        } catch (e) {
            console.error("Failed to parse board data", e);
            return { elements: [], appState: {}, scrollToContent: true };
        }
    }, [board]);

    if (isLoading || !user) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-background">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground font-medium">Entering the canvas...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen w-screen flex flex-col bg-background">
            <header className="h-16 border-b flex items-center justify-between px-6 bg-background/80 backdrop-blur-md z-20">
                <div className="flex items-center gap-6">
                    <Link href="/boards">
                        <Button variant="ghost" size="icon" className="rounded-full hover:bg-muted font-bold">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <div className="flex flex-col">
                        <h1 className="font-bold text-lg leading-tight">{board?.title}</h1>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Users className="w-3 h-3 text-green-500" />
                            Collaborative Session
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleCopyUrl} className="rounded-full">
                        <Share2 className="w-4 h-4 mr-2" />
                        Share
                    </Button>
                    <Button onClick={handleSave} disabled={saveMutation.isPending} className="rounded-full font-bold shadow-lg shadow-primary/20">
                        {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                        {saveMutation.isPending ? "Saving..." : "Save Progress"}
                    </Button>
                </div>
            </header>

            <div className="flex-1 relative overflow-hidden bg-[#f8f9fa]">
                {/* Excalidraw needs a container with dimensions */}
                <Excalidraw
                    excalidrawAPI={(api) => setExcalidrawAPI(api)}
                    initialData={initialData as any}
                    onChange={onChange}
                    theme="light" // Force light theme for consistency
                    UIOptions={{
                        canvasActions: {
                            toggleTheme: false,
                            clearCanvas: true,
                            loadScene: false,
                            saveToActiveFile: false,
                        }
                    }}
                />
            </div>
        </div>
    );
}
