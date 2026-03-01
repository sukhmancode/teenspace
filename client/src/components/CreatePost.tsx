import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPostSchema, InsertPost } from "@shared/schema";
import { useCreatePost } from "@/hooks/use-posts";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Paintbrush, Type } from "lucide-react";

const FONTS = ["Inter", "Outfit", "JetBrains Mono", "Serif"];
const COLORS = ["#ffffff", "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#a855f7", "#ec4899", "#111827"];

export function CreatePost({ isModal = false, onCreated }: { isModal?: boolean; onCreated?: () => void }) {
  const { user } = useAuth();
  const createPost = useCreatePost();
  
  const [selectedFont, setSelectedFont] = useState("Inter");
  const [selectedColor, setSelectedColor] = useState("#ffffff");

  const form = useForm<InsertPost>({
    resolver: zodResolver(insertPostSchema),
    defaultValues: {
      content: "",
      fontStyle: "Inter",
      backgroundColor: "#ffffff",
    },
  });

  const onSubmit = (data: InsertPost) => {
    createPost.mutate(
      { ...data, fontStyle: selectedFont, backgroundColor: selectedColor },
      {
        onSuccess: () => {
          form.reset();
          setSelectedColor("#ffffff");
          setSelectedFont("Inter");
          onCreated?.();
        }
      }
    );
  };

  if (!user) return null;

  return (
    <div className="border-b bg-card p-4">
      <div className="flex gap-4">
        <div className="flex-shrink-0">
           <Avatar className="w-10 h-10">
              <AvatarImage src={user.avatarUrl} />
              <AvatarFallback>{user?.displayName?.[0] || user?.username?.[0] || "?"}</AvatarFallback>
            </Avatar>
        </div>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 space-y-4">
          <Textarea 
            {...form.register("content")}
            placeholder="What's happening?" 
            className="border-none resize-none bg-transparent text-lg focus-visible:ring-0 min-h-[100px] p-0"
            style={{ 
              fontFamily: selectedFont,
              color: selectedColor !== '#ffffff' ? selectedColor : undefined 
            }}
          />
          
          {selectedColor !== '#ffffff' && (
             <div 
               className="h-2 w-full rounded-full opacity-50 mb-2" 
               style={{ backgroundColor: selectedColor }} 
             />
          )}

          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button type="button" variant="ghost" size="icon" className="text-primary hover:bg-primary/10">
                    <Type className="w-5 h-5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-40 p-2" align="start">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground mb-2 px-2">Font Style</p>
                    {FONTS.map(font => (
                      <button
                        key={font}
                        type="button"
                        onClick={() => setSelectedFont(font)}
                        className="w-full text-left px-2 py-1.5 rounded-md hover:bg-muted text-sm"
                        style={{ fontFamily: font }}
                      >
                        {font}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button type="button" variant="ghost" size="icon" className="text-primary hover:bg-primary/10">
                    <Paintbrush className="w-5 h-5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3" align="start">
                   <p className="text-xs font-medium text-muted-foreground mb-2">Background Color</p>
                   <div className="grid grid-cols-5 gap-2">
                     {COLORS.map(color => (
                       <button
                         key={color}
                         type="button"
                         onClick={() => setSelectedColor(color)}
                         className={`w-8 h-8 rounded-full border shadow-sm transition-transform hover:scale-110 ${selectedColor === color ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                         style={{ backgroundColor: color }}
                       />
                     ))}
                   </div>
                </PopoverContent>
              </Popover>
            </div>

            <Button 
              type="submit" 
              disabled={createPost.isPending || !form.watch("content")}
              className="rounded-full px-6 font-bold"
            >
              {createPost.isPending ? "Posting..." : "Post"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
