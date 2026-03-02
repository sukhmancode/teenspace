import { pgTable, text, serial, integer, boolean, timestamp, foreignKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// === USERS ===
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name").notNull(),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  coverUrl: text("cover_url"),
  studyModeEnabled: boolean("study_mode_enabled").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// === USER DAILY USAGE ===
export const userDailyUsage = pgTable("user_daily_usage", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  date: timestamp("date").notNull().defaultNow(),
  totalMinutes: integer("total_minutes").notNull().default(0),
  isLocked: boolean("is_locked").notNull().default(false),
});

// (Move schemas to bottom)

// === POSTS ===
export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  category: text("category").default("general"), // "education", "general", "entertainment", etc.
  fontStyle: text("font_style").default("Inter"),
  backgroundColor: text("background_color").default("#ffffff"),
  originalPostId: integer("original_post_id"), // For reposts
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    parentReference: foreignKey({
      columns: [table.originalPostId],
      foreignColumns: [table.id],
    }),
  };
});

// (Move schemas to bottom)

// === SOCIAL INTERACTIONS ===
export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  postId: integer("post_id").notNull().references(() => posts.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// (Move schemas to bottom)

export const likes = pgTable("likes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  postId: integer("post_id").notNull().references(() => posts.id),
});

export const reposts = pgTable("reposts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  postId: integer("post_id").notNull().references(() => posts.id),
  content: text("content"), // Optional quote
  createdAt: timestamp("created_at").defaultNow(),
});

// (Move schemas to bottom)

export const follows = pgTable("follows", {
  id: serial("id").primaryKey(),
  followerId: integer("follower_id").notNull().references(() => users.id),
  followingId: integer("following_id").notNull().references(() => users.id),
});

export const blocks = pgTable("blocks", {
  id: serial("id").primaryKey(),
  blockerId: integer("blocker_id").notNull().references(() => users.id),
  blockedId: integer("blocked_id").notNull().references(() => users.id),
});

// === CHAT ===
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  participant1Id: integer("participant1_id").notNull().references(() => users.id),
  participant2Id: integer("participant2_id").notNull().references(() => users.id),
  lastMessageAt: timestamp("last_message_at").defaultNow(),
  missedCallFrom: integer("missed_call_from"), // Tracks if there was a missed call
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id),
  senderId: integer("sender_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  read: boolean("read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// (Move schemas to bottom)

// === BOARDS ===
export const boards = pgTable("boards", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  elements: text("elements").default("[]"), // Store serialized Excalidraw elements
  appState: text("app_state").default("{}"), // Store serialized Excalidraw appState
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// (Move schemas to bottom)


// === RELATIONS ===
export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
  likes: many(likes),
  comments: many(comments),
  reposts: many(reposts),
  followers: many(follows, { relationName: "followers" }),
  following: many(follows, { relationName: "following" }),
  dailyUsage: many(userDailyUsage),
}));

export const userDailyUsageRelations = relations(userDailyUsage, ({ one }) => ({
  user: one(users, {
    fields: [userDailyUsage.userId],
    references: [users.id],
  }),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, {
    fields: [posts.userId],
    references: [users.id],
  }),
  likes: many(likes),
  comments: many(comments),
  reposts: many(reposts),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  author: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),
  post: one(posts, {
    fields: [comments.postId],
    references: [posts.id],
  }),
}));

export const likesRelations = relations(likes, ({ one }) => ({
  user: one(users, {
    fields: [likes.userId],
    references: [users.id],
  }),
  post: one(posts, {
    fields: [likes.postId],
    references: [posts.id],
  }),
}));

export const repostsRelations = relations(reposts, ({ one }) => ({
  user: one(users, {
    fields: [reposts.userId],
    references: [users.id],
  }),
  post: one(posts, {
    fields: [reposts.postId],
    references: [posts.id],
  }),
}));

export const conversationsRelations = relations(conversations, ({ many, one }) => ({
  messages: many(messages),
  participant1: one(users, {
    fields: [conversations.participant1Id],
    references: [users.id],
  }),
  participant2: one(users, {
    fields: [conversations.participant2Id],
    references: [users.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
}));

export const boardsRelations = relations(boards, ({ one }) => ({
  author: one(users, {
    fields: [boards.userId],
    references: [users.id],
  }),
}));

// === ZOD SCHEMAS ===
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  displayName: true,
  bio: true,
  avatarUrl: true,
  coverUrl: true,
});

export const insertPostSchema = createInsertSchema(posts).pick({
  content: true,
  fontStyle: true,
  backgroundColor: true,
  originalPostId: true,
});

export const insertCommentSchema = createInsertSchema(comments).pick({
  content: true,
  postId: true,
});

export const insertRepostSchema = createInsertSchema(reposts).pick({
  content: true,
  postId: true,
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  content: true,
  conversationId: true,
});

export const insertBoardSchema = createInsertSchema(boards).pick({
  title: true,
  elements: true,
  appState: true,
});

export const insertUserDailyUsageSchema = createInsertSchema(userDailyUsage).pick({
  userId: true,
  date: true,
  totalMinutes: true,
  isLocked: true,
});

// === TYPES ===
export type User = {
  id: number;
  username: string;
  password: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  studyModeEnabled: boolean;
  createdAt: Date | null;
};

export type Post = {
  id: number;
  userId: number;
  content: string;
  category: string | null;
  fontStyle: string | null;
  backgroundColor: string | null;
  originalPostId: number | null;
  createdAt: Date | null;
};

export type Comment = {
  id: number;
  userId: number;
  postId: number;
  content: string;
  createdAt: Date | null;
};

export type Like = {
  id: number;
  userId: number;
  postId: number;
};

export type Repost = {
  id: number;
  userId: number;
  postId: number;
  content: string | null;
  createdAt: Date | null;
};

export type Follow = {
  id: number;
  followerId: number;
  followingId: number;
};

export type Block = {
  id: number;
  blockerId: number;
  blockedId: number;
};

export type Conversation = {
  id: number;
  participant1Id: number;
  participant2Id: number;
  lastMessageAt: Date | null;
  missedCallFrom: number | null;
};

export type Message = {
  id: number;
  conversationId: number;
  senderId: number;
  content: string;
  read: boolean | null;
  createdAt: Date | null;
};

export type Board = {
  id: number;
  userId: number;
  title: string;
  elements: string | null;
  appState: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type UserDailyUsage = {
  id: number;
  userId: number;
  date: Date;
  totalMinutes: number;
  isLocked: boolean;
};

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertPost = z.infer<typeof insertPostSchema>;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type InsertRepost = z.infer<typeof insertRepostSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type InsertBoard = z.infer<typeof insertBoardSchema>;
export type InsertUserDailyUsage = z.infer<typeof insertUserDailyUsageSchema>;

// Detailed types for frontend
export type PostWithDetails = Post & {
  author: User;
  likes: Like[];
  comments: Comment[];
  reposts: Repost[];
  likeCount: number;
  commentCount: number;
  repostCount: number;
  hasLiked: boolean;
  originalPost?: Post & { author: User };
};

export type ConversationWithDetails = Conversation & {
  otherUser: User;
  lastMessage?: Message;
};
