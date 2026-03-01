import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useConversations() {
  return useQuery({
    queryKey: [api.chat.list.path],
    queryFn: async () => {
      const res = await fetch(api.chat.list.path);
      if (!res.ok) throw new Error("Failed to fetch conversations");
      return await res.json();
    },
    refetchInterval: 5000, // Simple polling for now
  });
}

export function useMessages(conversationId: number) {
  return useQuery({
    queryKey: [api.chat.getMessages.path, conversationId],
    queryFn: async () => {
      const url = buildUrl(api.chat.getMessages.path, { id: conversationId });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch messages");
      return await res.json();
    },
    enabled: !!conversationId,
    refetchInterval: 3000, // Simple polling for now
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ conversationId, content }: { conversationId: number, content: string }) => {
      const url = buildUrl(api.chat.sendMessage.path, { id: conversationId });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Failed to send message");
      return await res.json();
    },
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({ queryKey: [api.chat.getMessages.path, conversationId] });
      queryClient.invalidateQueries({ queryKey: [api.chat.list.path] });
    },
  });
}

export function useStartConversation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (participantId: number) => {
      const res = await fetch(api.chat.start.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId }),
      });
      if (!res.ok) throw new Error("Failed to start conversation");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.chat.list.path] });
    },
  });
}
