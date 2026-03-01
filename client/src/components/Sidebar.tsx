import { Link, useLocation } from "wouter";
import { Home, Compass, MessageCircle, User, LogOut, PenSquare, Layout } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const navItems = [
    { label: "Home", href: "/", icon: Home },
    { label: "Explore", href: "/explore", icon: Compass },
    { label: "Boards", href: "/boards", icon: Layout },
    { label: "Messages", href: "/messages", icon: MessageCircle },
    { label: "Profile", href: user ? `/profile/${user.username}` : "/login", icon: User },
  ];

  if (!user) return null;

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 border-r bg-card/50 backdrop-blur-xl p-4">
      <div className="mb-8 px-4 py-2">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent font-display">
          SocialApp
        </h1>
      </div>

      <nav className="flex-1 space-y-2">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  "flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer group",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 font-semibold"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon className={cn("w-6 h-6", isActive ? "stroke-[2.5]" : "group-hover:scale-110 transition-transform")} />
                <span className="text-lg">{item.label}</span>
              </div>
            </Link>
          );
        })}

        <div className="pt-4">
          <Link href="/compose">
            <Button className="w-full h-12 text-lg rounded-full font-bold shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all hover:-translate-y-0.5">
              <PenSquare className="mr-2 w-5 h-5" />
              Post
            </Button>
          </Link>
        </div>
      </nav>

      <div className="mt-auto pt-4 border-t shrink-0">
        <div className="flex items-center justify-between p-2 rounded-xl hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-purple-400 p-[2px] shrink-0">
              <div className="w-full h-full rounded-full bg-background flex items-center justify-center overflow-hidden">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.username} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
            </div>
            <div className="flex flex-col truncate">
              <span className="font-semibold text-sm truncate">{user.displayName}</span>
              <span className="text-xs text-muted-foreground truncate">@{user.username}</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => logout()}
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
