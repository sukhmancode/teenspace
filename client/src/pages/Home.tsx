import { useState } from "react";
import { usePosts } from "@/hooks/use-posts";
import { CreatePost } from "@/components/CreatePost";
import { PostCard } from "@/components/PostCard";
import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Home() {
  const [feedType, setFeedType] = useState<'latest' | 'following' | 'popular'>('latest');
  const { data: posts, isLoading, error } = usePosts(feedType);

  return (
    <div className="min-h-screen bg-background flex justify-center">
      <Sidebar />
      
      <main className="w-full max-w-2xl border-x min-h-screen pb-20 md:pb-0">
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b">
          <h2 className="px-4 py-3 text-xl font-bold hidden md:block">Home</h2>
          <div className="flex w-full">
            <button 
              onClick={() => setFeedType('latest')}
              className={cn(
                "flex-1 py-4 text-sm font-medium hover:bg-muted/50 transition-colors relative",
                feedType === 'latest' ? "text-foreground" : "text-muted-foreground"
              )}
            >
              For you
              {feedType === 'latest' && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-primary rounded-full" />
              )}
            </button>
            <button 
              onClick={() => setFeedType('following')}
              className={cn(
                "flex-1 py-4 text-sm font-medium hover:bg-muted/50 transition-colors relative",
                feedType === 'following' ? "text-foreground" : "text-muted-foreground"
              )}
            >
              Following
              {feedType === 'following' && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-primary rounded-full" />
              )}
            </button>
          </div>
        </header>

        <div className="hidden md:block">
          <CreatePost />
        </div>

        {isLoading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="p-8 text-center text-muted-foreground">
            Something went wrong. Please try again.
          </div>
        ) : posts?.length === 0 ? (
          <div className="p-12 text-center">
            <h3 className="text-lg font-semibold mb-2">No posts yet</h3>
            <p className="text-muted-foreground">Be the first to share something!</p>
          </div>
        ) : (
          <div className="divide-y">
            {posts?.map((post: any) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </main>

      <div className="hidden lg:block w-80 p-4 sticky top-0 h-screen">
         <div className="bg-card rounded-2xl border p-4 shadow-sm">
           <h3 className="font-bold text-lg mb-4">Who to follow</h3>
           {/* Placeholder for suggestions */}
           <div className="space-y-4">
             {[1, 2, 3].map(i => (
               <div key={i} className="flex items-center justify-between">
                 <div className="flex items-center gap-2">
                   <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
                   <div className="space-y-1">
                     <div className="w-20 h-3 bg-muted rounded animate-pulse" />
                     <div className="w-12 h-2 bg-muted rounded animate-pulse" />
                   </div>
                 </div>
                 <Button size="sm" variant="outline" className="rounded-full">Follow</Button>
               </div>
             ))}
           </div>
         </div>
         
         <div className="mt-4 text-xs text-muted-foreground px-2">
           <p>© 2024 SocialApp. All rights reserved.</p>
         </div>
      </div>

      <MobileNav />
    </div>
  );
}
