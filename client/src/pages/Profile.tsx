import { useState } from "react";
import { useRoute, Link } from "wouter";
import { useUser, useFollowUser } from "@/hooks/use-users";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";
import { PostCard } from "@/components/PostCard";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Calendar, MapPin, Link as LinkIcon, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { useVoiceCall } from "@/hooks/use-voice-call";
import { Phone, Camera } from "lucide-react";

function EditProfileDialog({ user }: { user: any }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  
  const form = useForm({
    defaultValues: {
      displayName: user.displayName,
      bio: user.bio || "",
      avatarUrl: user.avatarUrl || "",
      coverUrl: user.coverUrl || "",
    }
  });

  const mutation = useMutation({
    mutationFn: async (values: any) => {
      const res = await apiRequest("PATCH", `/api/users/${user.id}`, values);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.users.get.path, user.username] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: "Profile updated" });
      setOpen(false);
    }
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-full font-semibold mt-12">
          <Camera className="w-4 h-4 mr-2" />
          Edit Profile
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Name</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bio</FormLabel>
                  <FormControl><Textarea {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="avatarUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Avatar URL</FormLabel>
                  <FormControl><Input {...field} placeholder="https://..." /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="coverUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cover Image URL</FormLabel>
                  <FormControl><Input {...field} placeholder="https://..." /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={mutation.isPending}>Save changes</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function Profile() {
  const [match, params] = useRoute("/profile/:username");
  const username = params?.username || "";
  
  const { data: user, isLoading } = useUser(username);
  const { user: currentUser } = useAuth();
  const { mutate: toggleFollow } = useFollowUser();

  if (isLoading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <div className="p-8 text-center">User not found</div>;
  }

  const isMe = currentUser?.id === user.id;
  const isFollowing = user.isFollowing; 
  const { startCall } = useVoiceCall();

  return (
    <div className="min-h-screen bg-background flex justify-center">
      <Sidebar />
      
      <main className="w-full max-w-2xl border-x min-h-screen pb-20 md:pb-0">
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b px-4 py-2 flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h2 className="font-bold text-lg leading-tight">{user.displayName}</h2>
            <p className="text-xs text-muted-foreground">{user.posts?.length || 0} posts</p>
          </div>
        </header>

        {/* Hero Image */}
        <div 
          className="h-32 bg-gradient-to-r from-primary/30 to-purple-400/30 w-full bg-cover bg-center" 
          style={user.coverUrl ? { backgroundImage: `url(${user.coverUrl})` } : {}}
        />

        <div className="px-4 pb-4 border-b">
          <div className="flex justify-between items-start -mt-10 mb-4">
             <Avatar className="w-24 h-24 border-4 border-background ring-4 ring-muted shadow-md">
               <AvatarImage src={user.avatarUrl} />
               <AvatarFallback className="text-2xl font-bold">{user.displayName?.[0] || user.username?.[0]}</AvatarFallback>
             </Avatar>
             
             <div className="flex gap-2 items-center mt-12">
               {!isMe && (
                 <Button 
                   variant="outline" 
                   size="icon" 
                   className="rounded-full"
                   onClick={() => startCall(user.id, user)}
                 >
                   <Phone className="w-4 h-4" />
                 </Button>
               )}
               {isMe ? (
                 <EditProfileDialog user={user} />
               ) : (
                 <Button 
                   variant={isFollowing ? "outline" : "default"}
                   className="rounded-full font-semibold w-24"
                   onClick={() => toggleFollow({ id: user.id, isFollowing })}
                 >
                   {isFollowing ? "Following" : "Follow"}
                 </Button>
               )}
             </div>
          </div>

          <div className="space-y-1 mb-4">
            <h1 className="text-2xl font-bold font-display">{user.displayName}</h1>
            <p className="text-muted-foreground">@{user.username}</p>
          </div>

          {user.bio && <p className="mb-4 text-base">{user.bio}</p>}

          <div className="flex gap-4 text-muted-foreground text-sm mb-4">
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              <span>Internet</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>Joined {format(new Date(user.createdAt), "MMMM yyyy")}</span>
            </div>
          </div>

          <div className="flex gap-4 text-sm">
            <div className="hover:underline cursor-pointer">
              <span className="font-bold text-foreground">{user.followingCount || 0}</span>
              <span className="text-muted-foreground ml-1">Following</span>
            </div>
            <div className="hover:underline cursor-pointer">
              <span className="font-bold text-foreground">{user.followerCount || 0}</span>
              <span className="text-muted-foreground ml-1">Followers</span>
            </div>
          </div>
        </div>

        <Tabs defaultValue="posts" className="w-full">
          <TabsList className="w-full rounded-none border-b bg-transparent h-12 p-0">
            <TabsTrigger 
              value="posts" 
              className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent h-full font-semibold"
            >
              Posts
            </TabsTrigger>
            <TabsTrigger 
              value="likes" 
              className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent h-full font-semibold"
            >
              Likes
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="posts" className="mt-0">
             {user.posts?.length > 0 ? (
               <div className="divide-y">
                 {user.posts.map((post: any) => (
                   <PostCard key={post.id} post={{...post, author: user}} />
                 ))}
               </div>
             ) : (
               <div className="p-12 text-center text-muted-foreground">No posts yet</div>
             )}
          </TabsContent>
          
          <TabsContent value="likes" className="mt-0">
             <div className="p-12 text-center text-muted-foreground">Liked posts will appear here</div>
          </TabsContent>
        </Tabs>
      </main>

      <div className="hidden lg:block w-80 p-4" /> {/* Spacer */}

      <MobileNav />
    </div>
  );
}
