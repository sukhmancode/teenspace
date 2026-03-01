import { useState, useEffect, useRef } from "react";
import { useConversations, useMessages, useSendMessage, useStartConversation } from "@/hooks/use-chat";
import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, Plus, Phone, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { formatDistanceToNow } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useSearchUsers } from "@/hooks/use-users";
import { useVoiceCall } from "@/hooks/use-voice-call";
import { Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { api } from "@shared/routes";

export default function Messages() {
  const { user } = useAuth();
  const { data: conversations, isLoading: loadingConversations } = useConversations();
  const [selectedChatId, setSelectedChatId] = useState<number | null>(null);

  const selectedConversation = conversations?.find((c: any) => c.id === selectedChatId);

  return (
    <div className="min-h-screen bg-background flex justify-center">
      <Sidebar />
      
      <main className="flex-1 flex max-w-5xl h-[100dvh] border-x overflow-hidden relative">
        {/* Conversation List */}
        <div className={cn(
          "w-full md:w-80 lg:w-96 border-r flex flex-col bg-card",
          selectedChatId ? "hidden md:flex" : "flex"
        )}>
          <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-card z-10">
            <h2 className="font-bold text-xl">Messages</h2>
            <NewChatDialog setSelectedChatId={setSelectedChatId} />
          </div>
          
          <ScrollArea className="flex-1">
            {loadingConversations ? (
              <div className="p-4 flex justify-center"><Loader2 className="animate-spin" /></div>
            ) : conversations?.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No conversations yet. Start one!
              </div>
            ) : (
              <div className="flex flex-col">
                {conversations?.map((chat: any) => (
                  <button
                    key={chat.id}
                    onClick={() => setSelectedChatId(chat.id)}
                    className={cn(
                      "flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors text-left border-b border-border/40",
                      selectedChatId === chat.id && "bg-muted border-l-4 border-l-primary"
                    )}
                  >
                    <Avatar>
                      <AvatarImage src={chat.otherUser.avatarUrl} />
                      <AvatarFallback>{chat.otherUser.displayName[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <div className="flex items-center gap-2 truncate">
                          <span className="font-semibold truncate">{chat.otherUser.displayName}</span>
                          {chat.missedCallFrom && chat.missedCallFrom === chat.otherUser.id && (
                            <span className="inline-flex items-center rounded-full bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive ring-1 ring-inset ring-destructive/20">
                              Missed Call
                            </span>
                          )}
                        </div>
                        {chat.lastMessage && (
                          <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                            {formatDistanceToNow(new Date(chat.lastMessage.createdAt), { addSuffix: false })}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {chat.lastMessage?.content || "Start a conversation"}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Chat View */}
        <div className={cn(
          "flex-1 flex flex-col bg-background relative h-full",
          !selectedChatId ? "hidden md:flex" : "flex"
        )}>
          {selectedChatId ? (
            <ChatView 
              conversationId={selectedChatId} 
              recipient={selectedConversation?.otherUser}
              onBack={() => setSelectedChatId(null)}
              currentUser={user}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <Send className="w-8 h-8 opacity-50" />
              </div>
              <h3 className="text-xl font-bold mb-2">Select a message</h3>
              <p>Choose from your existing conversations, start a new one, or get swiping.</p>
              <div className="mt-6">
                <NewChatDialog setSelectedChatId={setSelectedChatId} trigger={<Button size="lg" className="rounded-full">New Message</Button>} />
              </div>
            </div>
          )}
        </div>
      </main>

      <MobileNav />
    </div>
  );
}

function ChatView({ conversationId, recipient, onBack, currentUser }: any) {
  const { data: messages, isLoading } = useMessages(conversationId);
  const { mutate: sendMessage, isPending } = useSendMessage();
  const { startCall } = useVoiceCall();
  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (conversationId) {
      apiRequest("PATCH", `/api/conversations/${conversationId}/clear-missed-call`);
    }
  }, [conversationId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    sendMessage(
      { conversationId, content: inputValue },
      { onSuccess: () => setInputValue("") }
    );
  };

  return (
    <>
      <div className="h-16 px-4 border-b flex items-center justify-between bg-card/50 backdrop-blur sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="md:hidden -ml-2" onClick={onBack}>
            ←
          </Button>
          <Avatar className="w-8 h-8">
            <AvatarImage src={recipient?.avatarUrl} />
            <AvatarFallback>{recipient?.displayName?.[0]}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-bold leading-none">{recipient?.displayName}</h3>
            <p className="text-xs text-muted-foreground">@{recipient?.username}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DeleteChatDialog conversationId={conversationId} onDeleted={onBack} />
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full"
            onClick={() => startCall(recipient.id, recipient, conversationId, false)}
          >
            <Phone className="w-5 h-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full"
            onClick={() => startCall(recipient.id, recipient, conversationId, true)}
          >
            <Video className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        {isLoading ? (
          <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
        ) : (
          <div className="flex flex-col gap-4 min-h-full justify-end">
            {messages?.map((msg: any) => {
              const isMe = msg.senderId === currentUser?.id;
              return (
                <div 
                  key={msg.id} 
                  className={cn(
                    "max-w-[70%] px-4 py-2 rounded-2xl shadow-sm",
                    isMe 
                      ? "bg-primary text-primary-foreground self-end rounded-tr-none" 
                      : "bg-muted text-foreground self-start rounded-tl-none"
                  )}
                >
                  {msg.content}
                  <div className={cn("text-[10px] mt-1 opacity-70", isMe ? "text-right" : "text-left")}>
                    {formatDistanceToNow(new Date(msg.createdAt))}
                  </div>
                </div>
              );
            })}
            <div ref={scrollRef} />
          </div>
        )}
      </ScrollArea>

      <form onSubmit={handleSend} className="p-4 border-t bg-card relative z-20 mb-16 md:mb-0">
        <div className="flex gap-2 pb-safe">
          <Input 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Start a new message"
            className="flex-1 rounded-full bg-muted border-none focus-visible:ring-1 focus-visible:ring-primary h-12 text-base"
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={!inputValue.trim() || isPending}
            className="rounded-full w-12 h-12 shrink-0"
          >
            <Send className="w-5 h-5 ml-0.5" />
          </Button>
        </div>
      </form>
    </>
  );
}

function DeleteChatDialog({ conversationId, onDeleted }: { conversationId: number; onDeleted: () => void }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const mutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/conversations/${conversationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.chat.list.path] });
      onDeleted();
      setOpen(false);
    }
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-destructive">
          <Trash2 className="w-5 h-5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Conversation</DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground py-4">Are you sure you want to delete this conversation? This action cannot be undone.</p>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="destructive" onClick={() => mutation.mutate()} disabled={mutation.isPending}>Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewChatDialog({ trigger, setSelectedChatId }: { trigger?: React.ReactNode; setSelectedChatId: (id: number) => void }) {
  const { user: currentUser } = useAuth();
  const [search, setSearch] = useState("");
  const { data: results } = useSearchUsers(search);
  const { mutate: startChat } = useStartConversation();
  const [open, setOpen] = useState(false);

  const handleStartChat = (participantId: number) => {
    startChat(participantId, {
      onSuccess: (conversation) => {
        setSelectedChatId(conversation.id);
        setOpen(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="rounded-full">
            <Plus className="w-6 h-6" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Message</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            placeholder="Search people"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="max-h-[300px] overflow-y-auto space-y-2">
            {results?.filter((u: any) => u.id !== currentUser?.id).map((u: any) => (
              <button
                key={u.id}
                onClick={() => handleStartChat(u.id)}
                className="w-full flex items-center gap-3 p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <Avatar>
                  <AvatarImage src={u.avatarUrl} />
                  <AvatarFallback>{u.displayName[0]}</AvatarFallback>
                </Avatar>
                <div className="text-left">
                  <div className="font-semibold">{u.displayName}</div>
                  <div className="text-sm text-muted-foreground">@{u.username}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
