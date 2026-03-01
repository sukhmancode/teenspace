import { Link, useLocation } from "wouter";
import { Home, Compass, MessageCircle, User, Plus, LogOut, Layout } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CreatePost } from "@/components/CreatePost";
import { useState } from "react";

export function MobileNav() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  if (!user) return null;

  const navItems = [
    { href: "/", icon: Home },
    { href: "/boards", icon: Layout },
    { href: "/explore", icon: Compass },
    { icon: Plus, isAction: true, onClick: () => setIsComposeOpen(true) },
    { href: "/messages", icon: MessageCircle },
    { href: `/profile/${user.username}`, icon: User },
  ];

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-background/95 backdrop-blur-md border-t flex items-center justify-around px-2 z-50 pb-safe">
        <div className="flex w-full items-center justify-between px-4 max-w-lg mx-auto">
          {navItems.map((item, index) => {
            const isActive = item.href ? location === item.href : false;

            if (item.isAction) {
              return (
                <button
                  key="compose-trigger"
                  onClick={item.onClick}
                  className="bg-primary text-primary-foreground rounded-full p-3 -mt-10 shadow-lg shadow-primary/30 active:scale-95 transition-transform border-4 border-background shrink-0"
                >
                  <item.icon className="w-6 h-6" />
                </button>
              );
            }

            return (
              <Link key={item.href || index} href={item.href!}>
                <div className={cn(
                  "p-3 rounded-full transition-colors flex flex-col items-center gap-1",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}>
                  <item.icon className={cn("w-6 h-6", isActive && "fill-current")} />
                </div>
              </Link>
            );
          })}
          <button
            onClick={() => logout()}
            className="p-3 text-muted-foreground hover:text-destructive transition-colors shrink-0"
          >
            <LogOut className="w-6 h-6" />
          </button>
        </div>
      </nav>

      <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
        <DialogContent className="sm:max-w-[525px] p-0 gap-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle>Create new post</DialogTitle>
          </DialogHeader>
          <div className="p-4">
            <CreatePost onCreated={() => setIsComposeOpen(false)} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
