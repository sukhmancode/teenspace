import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Layout, Loader2, Calendar } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function Boards() {
    const [title, setTitle] = useState("");
    const queryClient = useQueryClient();
    const [, setLocation] = useLocation();

    const { data: boards, isLoading } = useQuery({
        queryKey: ["/api/boards"],
        queryFn: async () => {
            const res = await fetch("/api/boards");
            if (!res.ok) throw new Error("Failed to fetch boards");
            return res.json();
        }
    });

    const createBoard = useMutation({
        mutationFn: async (title: string) => {
            const res = await fetch("/api/boards", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title })
            });
            if (!res.ok) throw new Error("Failed to create board");
            return res.json();
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["/api/boards"] });
            setLocation(`/board/${data.id}`);
        }
    });

    return (
        <div className="min-h-screen bg-background flex justify-center w-full">
            <Sidebar />

            <main className="w-full max-w-2xl border-x min-h-screen pb-20 md:pb-0 p-4">
                <header className="mb-8">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-2xl font-bold">Collaborative Boards</h1>
                    </div>

                    <div className="flex gap-2">
                        <Input
                            placeholder="Give your board a name..."
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="flex-1 rounded-xl h-12"
                        />
                        <Button
                            onClick={() => title && createBoard.mutate(title)}
                            disabled={createBoard.isPending || !title}
                            className="h-12 px-6 rounded-xl font-bold"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Create
                        </Button>
                    </div>
                </header>

                {isLoading ? (
                    <div className="py-20 flex justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : !boards || boards.length === 0 ? (
                    <div className="py-20 text-center border-2 border-dashed rounded-3xl p-12 bg-muted/30">
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                            <Layout className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">No boards yet</h3>
                        <p className="text-muted-foreground mb-6">Create a board to start drawing and collaborating in real-time.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {boards?.map((board: any) => (
                            <Link key={board.id} href={`/board/${board.id}`}>
                                <Card className="hover:ring-2 hover:ring-primary/50 cursor-pointer transition-all duration-200 group border-2 shadow-sm rounded-2xl overflow-hidden">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary transition-colors">
                                                    <Layout className="w-5 h-5 text-primary group-hover:text-primary-foreground" />
                                                </div>
                                                <span className="font-bold text-lg group-hover:text-primary transition-colors">{board.title}</span>
                                            </div>
                                            <Button variant="ghost" size="sm" className="hidden group-hover:flex">Open</Button>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-0">
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <Calendar className="w-3 h-3" />
                                            Updated {new Date(board.updatedAt).toLocaleDateString()}
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                )}
            </main>

            <div className="hidden lg:block w-80 p-4 sticky top-0 h-screen">
                <div className="bg-gradient-to-br from-primary/20 to-purple-500/20 rounded-2xl border p-6 shadow-sm">
                    <h3 className="font-bold text-lg mb-2">Collaboration Tips</h3>
                    <ul className="text-sm space-y-3 text-muted-foreground">
                        <li className="flex gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                            Share your board URL with friends to draw together.
                        </li>
                        <li className="flex gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                            Updates are synced in real-time across all users.
                        </li>
                        <li className="flex gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                            Don't forget to save your progress!
                        </li>
                    </ul>
                </div>
            </div>

            <MobileNav />
        </div>
    );
}
