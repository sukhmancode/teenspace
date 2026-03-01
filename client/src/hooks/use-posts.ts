import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { InsertPost, InsertComment } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

type FeedType = 'latest' | 'following' | 'popular';

export function usePosts(feedType: FeedType = 'latest') {
  return useQuery({
    queryKey: [api.posts.list.path, feedType],
    queryFn: async () => {
      const url = `${api.posts.list.path}?feed=${feedType}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch posts");
      return await res.json();
    },
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertPost) => {
      const res = await fetch(api.posts.create.path, {
        method: api.posts.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to create post");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.posts.list.path] });
      toast({ title: "Post published!", description: "Your thoughts are now out in the world." });
    },
  });
}

export function useLikePost() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, hasLiked }: { id: number, hasLiked: boolean }) => {
      const endpoint = hasLiked ? api.posts.unlike : api.posts.like;
      const url = buildUrl(endpoint.path, { id });
      
      const res = await fetch(url, { method: "POST" });
      if (!res.ok) throw new Error("Failed to toggle like");
      return await res.json();
    },
    onSuccess: () => {
      // Optimistic updates are hard, simpler to just invalidate for now
      queryClient.invalidateQueries({ queryKey: [api.posts.list.path] });
    },
  });
}

export function useRepost() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, content }: { id: number, content?: string }) => {
      const url = buildUrl(api.posts.repost.path, { id });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Failed to repost");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.posts.list.path] });
      toast({ title: "Reposted!", description: "Shared to your profile." });
    },
  });
}

export function useComments(postId: number) {
  return useQuery({
    queryKey: [api.posts.getComments.path, postId],
    queryFn: async () => {
      const url = buildUrl(api.posts.getComments.path, { id: postId });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch comments");
      return await res.json();
    },
  });
}

export function useAddComment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ postId, content }: { postId: number, content: string }) => {
      const url = buildUrl(api.posts.addComment.path, { id: postId });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Failed to add comment");
      return await res.json();
    },
    onSuccess: (_, { postId }) => {
      queryClient.invalidateQueries({ queryKey: [api.posts.getComments.path, postId] });
      queryClient.invalidateQueries({ queryKey: [api.posts.list.path] }); // Update counts
    },
  });
}
