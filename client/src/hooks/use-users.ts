import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useUser(username: string) {
  return useQuery({
    queryKey: [api.users.get.path, username],
    queryFn: async () => {
      const url = buildUrl(api.users.get.path, { username });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch user");
      return await res.json();
    },
    enabled: !!username,
  });
}

export function useSearchUsers(query: string) {
  return useQuery({
    queryKey: [api.users.search.path, query],
    queryFn: async () => {
      const url = `${api.users.search.path}?q=${encodeURIComponent(query)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to search users");
      return await res.json();
    },
    enabled: query.length > 0,
  });
}

export function useFollowUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, isFollowing }: { id: number, isFollowing: boolean }) => {
      const endpoint = isFollowing ? api.users.unfollow : api.users.follow;
      const url = buildUrl(endpoint.path, { id });
      
      const res = await fetch(url, { method: "POST" });
      if (!res.ok) throw new Error("Failed to update follow status");
    },
    onSuccess: (_, { isFollowing }) => {
      queryClient.invalidateQueries({ queryKey: [api.users.get.path] });
      toast({ 
        title: isFollowing ? "Unfollowed" : "Followed", 
        description: isFollowing ? "You are no longer following this user." : "You are now following this user." 
      });
    },
  });
}
