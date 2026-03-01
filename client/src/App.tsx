import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

import Home from "@/pages/Home";
import AuthPage from "@/pages/AuthPage";
import Profile from "@/pages/Profile";
import Messages from "@/pages/Messages";
import PostDetail from "@/pages/PostDetail";
import Boards from "@/pages/Boards";
import BoardDetail from "@/pages/BoardDetail";
import NotFound from "@/pages/not-found";

// Protected Route Wrapper
function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={AuthPage} />
      <Route path="/" component={() => <ProtectedRoute component={Home} />} />
      <Route path="/explore" component={() => <ProtectedRoute component={Home} />} /> {/* Reuse Home for now */}
      <Route path="/messages" component={() => <ProtectedRoute component={Messages} />} />
      <Route path="/profile/:username" component={Profile} />
      <Route path="/post/:id" component={PostDetail} />
      <Route path="/boards" component={() => <ProtectedRoute component={Boards} />} />
      <Route path="/board/:id" component={() => <ProtectedRoute component={BoardDetail} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

import { VoiceCallProvider } from "@/hooks/use-voice-call";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

function NotificationHandler() {
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      // Handle new messages
      if (data.type === "new_message" && data.message.senderId !== user.id) {
        // Play notification sound
        const audio = new Audio("/sounds/notification.mp3");
        audio.play().catch(console.error);

        toast({
          title: "New Message",
          description: data.message.content,
        });
      }
    };

    return () => socket.close();
  }, [user, toast]);

  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <VoiceCallProvider>
          <NotificationHandler />
          <Router />
        </VoiceCallProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
