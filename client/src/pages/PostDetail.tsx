import { useState } from "react";
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";
import { PostCard } from "@/components/PostCard";
import { useComments, useAddComment } from "@/hooks/use-posts";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { formatDistanceToNow } from "date-fns";

export default function PostDetail() {
  const [match, params] = useRoute("/post/:id");
  const id = params?.id ? parseInt(params.id) : 0;
  
  // Need a specific endpoint for single post fetching, reusing list for now isn't ideal but works if we filter
  // In a real app we'd add api.posts.get
  const { data: posts } = useQuery({ 
    queryKey: [api.posts.list.path, 'latest'], 
    queryFn: () => fetch(api.posts.list.path).then(res => res.json()) 
  });
  
  const post = posts?.find((p: any) => p.id === id);

  if (!post && posts) return <div>Post not found</div>;
  if (!post) return <div className="flex justify-center p-20"><Loader2 className="animate-spin"/></div>;

  return (
    <div className="min-h-screen bg-background flex justify-center">
      <Sidebar />
      <main className="w-full max-w-2xl border-x min-h-screen pb-20 md:pb-0">
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b px-4 py-3 flex items-center gap-4">
          <Link href="/">
             <Button variant="ghost" size="icon" className="rounded-full -ml-2">
               <ArrowLeft className="w-5 h-5" />
             </Button>
          </Link>
          <h2 className="font-bold text-lg">Post</h2>
        </header>

        <PostCard post={post} isDetail />
        
        <div className="border-t border-b p-4">
          <CommentForm postId={id} />
        </div>

        <CommentsList postId={id} />
      </main>
      <div className="hidden lg:block w-80 p-4" />
      <MobileNav />
    </div>
  );
}

function CommentForm({ postId }: { postId: number }) {
  const { user } = useAuth();
  const { mutate: addComment, isPending } = useAddComment();
  const [content, setContent] = useState("");

  if (!user) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    addComment({ postId, content }, {
      onSuccess: () => setContent("")
    });
  };

  return (
    <div className="flex gap-4">
      <Avatar className="w-10 h-10">
        <AvatarImage src={user.avatarUrl} />
        <AvatarFallback>{user.displayName?.[0] || user.username?.[0] || "?"}</AvatarFallback>
      </Avatar>
      <form onSubmit={handleSubmit} className="flex-1 space-y-4">
        <Textarea 
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Post your reply" 
          className="border-none resize-none bg-transparent text-lg focus-visible:ring-0 min-h-[50px] p-0"
        />
        <div className="flex justify-end">
          <Button 
            type="submit" 
            disabled={!content.trim() || isPending}
            className="rounded-full px-6 font-bold"
          >
            Reply
          </Button>
        </div>
      </form>
    </div>
  );
}

function CommentsList({ postId }: { postId: number }) {
  const { data: comments, isLoading } = useComments(postId);

  if (isLoading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin"/></div>;

  return (
    <div className="divide-y">
      {comments?.map((comment: any) => (
        <div key={comment.id} className="p-4 flex gap-4 hover:bg-muted/30 transition-colors">
           <Avatar className="w-10 h-10">
              <AvatarImage src={comment.author.avatarUrl} />
              <AvatarFallback>{comment.author.displayName?.[0] || comment.author.username?.[0] || "?"}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold">{comment.author.displayName}</span>
                <span className="text-muted-foreground text-sm">@{comment.author.username}</span>
                <span className="text-muted-foreground text-sm">· {formatDistanceToNow(new Date(comment.createdAt))}</span>
              </div>
              <p>{comment.content}</p>
            </div>
        </div>
      ))}
    </div>
  );
}
