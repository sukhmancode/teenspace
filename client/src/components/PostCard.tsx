import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Heart, MessageCircle, Repeat2, Share, MoreHorizontal } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useLikePost, useRepost } from "@/hooks/use-posts";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PostCardProps {
  post: any; // Type from schema is complex, simplified for component props
  isDetail?: boolean;
}

export function PostCard({ post, isDetail = false }: PostCardProps) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { mutate: toggleLike } = useLikePost();
  const { mutate: repost } = useRepost();
  
  const [isLiked, setIsLiked] = useState(post.hasLiked);
  const [likeCount, setLikeCount] = useState(post.likeCount);

  const isRepost = !!post.originalPost;

  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;

    const newLikedState = !isLiked;
    setIsLiked(newLikedState);
    setLikeCount((prev: number) => newLikedState ? prev + 1 : prev - 1);
    
    toggleLike({ id: post.id, hasLiked: isLiked });
  };

  const handleRepost = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    repost({ id: post.id });
  };

  const handleClick = () => {
    if (isDetail) return;
    setLocation(`/post/${post.id}`);
  };

  const displayPost = isRepost ? post.originalPost : post;

  return (
    <article 
      onClick={handleClick}
      className={cn(
        "border-b bg-card hover:bg-card/50 transition-colors cursor-pointer",
        isDetail ? "border-none cursor-default" : ""
      )}
    >
      {isRepost && (
        <div className="px-4 pt-2 flex items-center gap-2 text-muted-foreground text-xs font-bold">
          <Repeat2 className="w-3 h-3" />
          <span>@{post.author.username} reposted</span>
        </div>
      )}
      <div className="p-4 flex gap-4">
        {/* Avatar Column */}
        <div className="flex-shrink-0">
          <Link href={`/profile/${displayPost.author.username}`}>
            <Avatar className="w-12 h-12 border-2 border-background ring-2 ring-muted cursor-pointer hover:ring-primary transition-all">
              <AvatarImage src={displayPost.author.avatarUrl} />
              <AvatarFallback>{displayPost.author.displayName?.[0] || displayPost.author.username?.[0] || "?"}</AvatarFallback>
            </Avatar>
          </Link>
        </div>

        {/* Content Column */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 text-sm">
              <Link href={`/profile/${displayPost.author.username}`} className="font-bold hover:underline truncate text-foreground">
                {displayPost.author.displayName}
              </Link>
              <span className="text-muted-foreground truncate">@{displayPost.author.username}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground hover:underline">
                {formatDistanceToNow(new Date(displayPost.createdAt), { addSuffix: true })}
              </span>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-muted" onClick={(e) => e.stopPropagation()}>
                  <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Copy link</DropdownMenuItem>
                {user?.id === post.userId && (
                  <DropdownMenuItem className="text-destructive">Delete post</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div 
            className={cn(
              "rounded-xl p-4 mb-3 text-lg leading-relaxed whitespace-pre-wrap shadow-sm border",
              displayPost.backgroundColor !== '#ffffff' ? "text-white border-transparent" : "bg-background border-border"
            )}
            style={{ 
              fontFamily: displayPost.fontStyle,
              backgroundColor: displayPost.backgroundColor !== '#ffffff' ? displayPost.backgroundColor : undefined
            }}
          >
            {displayPost.content}
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between max-w-md text-muted-foreground">
            <Button 
              variant="ghost" 
              size="sm" 
              className="group rounded-full hover:bg-blue-500/10 hover:text-blue-500 px-2"
              onClick={(e) => {
                e.stopPropagation();
                if (!isDetail) setLocation(`/post/${post.id}`);
              }}
            >
              <MessageCircle className="w-5 h-5 mr-1.5" />
              <span className="text-xs font-medium">{post.commentCount || 0}</span>
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleRepost}
              className="group rounded-full hover:bg-green-500/10 hover:text-green-500 px-2"
            >
              <Repeat2 className="w-5 h-5 mr-1.5" />
              <span className="text-xs font-medium">{post.repostCount || 0}</span>
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLike}
              className={cn(
                "group rounded-full hover:bg-pink-500/10 hover:text-pink-500 px-2 transition-colors",
                isLiked && "text-pink-500"
              )}
            >
              <Heart className={cn("w-5 h-5 mr-1.5", isLiked && "fill-current animate-like")} />
              <span className="text-xs font-medium">{likeCount || 0}</span>
            </Button>
            
            <Button variant="ghost" size="sm" className="group rounded-full hover:bg-primary/10 hover:text-primary px-2">
              <Share className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
