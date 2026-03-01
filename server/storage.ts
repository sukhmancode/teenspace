import { db } from "./db";
import {
  users, posts, comments, likes, reposts, follows, blocks, conversations, messages, boards,
  type User, type InsertUser, type Post, type InsertPost, type Comment, type InsertComment,
  type Like, type Repost, type InsertRepost, type Follow, type Block, type Conversation, type Message, type InsertMessage,
  type Board, type InsertBoard,
  type PostWithDetails
} from "@shared/schema";
import { eq, and, desc, sql, or, ne, inArray } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  searchUsers(query: string): Promise<User[]>;

  // Follows/Blocks
  followUser(followerId: number, followingId: number): Promise<void>;
  unfollowUser(followerId: number, followingId: number): Promise<void>;
  getFollowers(userId: number): Promise<User[]>;
  getFollowing(userId: number): Promise<User[]>;
  blockUser(blockerId: number, blockedId: number): Promise<void>;
  unblockUser(blockerId: number, blockedId: number): Promise<void>;
  isBlocked(userId: number, targetId: number): Promise<boolean>;

  // Posts
  createPost(post: InsertPost & { userId: number }): Promise<Post>;
  getPost(id: number): Promise<Post | undefined>;
  getPosts(currentUserId: number, feedType: 'latest' | 'following' | 'popular'): Promise<PostWithDetails[]>;
  deletePost(id: number): Promise<void>;

  // Likes/Reposts
  likePost(userId: number, postId: number): Promise<void>;
  unlikePost(userId: number, postId: number): Promise<void>;
  repostPost(repost: InsertRepost & { userId: number }): Promise<void>;

  // Comments
  createComment(comment: InsertComment & { userId: number }): Promise<Comment>;
  getComments(postId: number): Promise<(Comment & { author: User })[]>;

  // Chat
  getConversations(userId: number): Promise<(Conversation & { otherUser: User, lastMessage?: Message })[]>;
  createConversation(user1Id: number, user2Id: number): Promise<Conversation>;
  getMessages(conversationId: number): Promise<Message[]>;
  createMessage(message: InsertMessage & { senderId: number }): Promise<Message>;

  // Boards
  createBoard(board: { userId: number, title: string }): Promise<Board>;
  getBoard(id: number): Promise<Board | undefined>;
  getBoards(userId: number): Promise<Board[]>;
  updateBoard(id: number, data: Partial<Board>): Promise<Board>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async searchUsers(query: string): Promise<User[]> {
    return db.select().from(users)
      .where(or(
        sql`username ILIKE ${`%${query}%`}`,
        sql`display_name ILIKE ${`%${query}%`}`
      ))
      .limit(10);
  }

  async followUser(followerId: number, followingId: number): Promise<void> {
    await db.insert(follows).values({ followerId, followingId }).onConflictDoNothing();
  }

  async unfollowUser(followerId: number, followingId: number): Promise<void> {
    await db.delete(follows).where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)));
  }

  async getFollowers(userId: number): Promise<User[]> {
    const results = await db.select({ user: users })
      .from(follows)
      .innerJoin(users, eq(follows.followerId, users.id))
      .where(eq(follows.followingId, userId));
    return results.map(r => r.user);
  }

  async getFollowing(userId: number): Promise<User[]> {
    const results = await db.select({ user: users })
      .from(follows)
      .innerJoin(users, eq(follows.followingId, users.id))
      .where(eq(follows.followerId, userId));
    return results.map(r => r.user);
  }

  async blockUser(blockerId: number, blockedId: number): Promise<void> {
    await db.insert(blocks).values({ blockerId, blockedId }).onConflictDoNothing();
    // Also remove follow relationships
    await this.unfollowUser(blockerId, blockedId);
    await this.unfollowUser(blockedId, blockerId);
  }

  async unblockUser(blockerId: number, blockedId: number): Promise<void> {
    await db.delete(blocks).where(and(eq(blocks.blockerId, blockerId), eq(blocks.blockedId, blockedId)));
  }

  async isBlocked(userId: number, targetId: number): Promise<boolean> {
    const [block] = await db.select().from(blocks)
      .where(or(
        and(eq(blocks.blockerId, userId), eq(blocks.blockedId, targetId)),
        and(eq(blocks.blockerId, targetId), eq(blocks.blockedId, userId))
      ));
    return !!block;
  }

  async createPost(post: InsertPost & { userId: number }): Promise<Post> {
    const [newPost] = await db.insert(posts).values(post as any).returning();
    return newPost;
  }

  async getPost(id: number): Promise<Post | undefined> {
    const [post] = await db.select().from(posts).where(eq(posts.id, id));
    return post;
  }

  async getPosts(currentUserId: number, feedType: 'latest' | 'following' | 'popular'): Promise<PostWithDetails[]> {
    let query = db.select().from(posts).leftJoin(users, eq(posts.userId, users.id));

    // Filter by blocked users
    const blocked = await db.select().from(blocks).where(or(eq(blocks.blockerId, currentUserId), eq(blocks.blockedId, currentUserId)));
    const blockedIds = blocked.map(b => b.blockerId === currentUserId ? b.blockedId : b.blockerId);

    if (blockedIds.length > 0) {
      query = query.where(not(inArray(posts.userId, blockedIds))) as any;
    }

    if (feedType === 'following') {
      const following = await this.getFollowing(currentUserId);
      const followingIds = following.map(u => u.id);
      followingIds.push(currentUserId);

      if (followingIds.length > 0) {
        query = query.where(inArray(posts.userId, followingIds)) as any;
      } else {
        return [];
      }
    }

    const results = await query.orderBy(desc(posts.createdAt)).limit(50);
    const enriched: PostWithDetails[] = [];

    for (const row of results) {
      const post = row.posts;
      const author = row.users!;

      let originalPostWithAuthor = null;
      if (post.originalPostId) {
        const [orig] = await db.select().from(posts).leftJoin(users, eq(posts.userId, users.id)).where(eq(posts.id, post.originalPostId));
        if (orig) {
          originalPostWithAuthor = { ...orig.posts, author: orig.users! };
        }
      }

      const postLikes = await db.select().from(likes).where(eq(likes.postId, post.id));
      const postComments = await db.select().from(comments).where(eq(comments.postId, post.id));
      const postReposts = await db.select().from(reposts).where(eq(reposts.postId, post.id));

      enriched.push({
        ...post,
        author,
        likes: postLikes,
        comments: postComments,
        reposts: postReposts,
        likeCount: postLikes.length,
        commentCount: postComments.length,
        repostCount: postReposts.length,
        hasLiked: postLikes.some(l => l.userId === currentUserId),
        originalPost: originalPostWithAuthor as any
      });
    }

    if (feedType === 'popular') {
      enriched.sort((a, b) => b.likeCount - a.likeCount);
    }

    return enriched;
  }

  async deletePost(id: number): Promise<void> {
    await db.delete(posts).where(eq(posts.id, id));
  }

  async likePost(userId: number, postId: number): Promise<void> {
    await db.insert(likes).values({ userId, postId }).onConflictDoNothing();
  }

  async unlikePost(userId: number, postId: number): Promise<void> {
    await db.delete(likes).where(and(eq(likes.userId, userId), eq(likes.postId, postId)));
  }

  async repostPost(repost: InsertRepost & { userId: number }): Promise<void> {
    await db.insert(reposts).values(repost).onConflictDoNothing();

    // Create a new post that represents the repost
    const originalPost = await this.getPost(repost.postId);
    if (originalPost) {
      await this.createPost({
        userId: repost.userId,
        content: originalPost.content,
        fontStyle: originalPost.fontStyle,
        backgroundColor: originalPost.backgroundColor,
        originalPostId: originalPost.id
      });
    }
  }

  async createComment(comment: InsertComment & { userId: number }): Promise<Comment> {
    const [newComment] = await db.insert(comments).values(comment).returning();
    return newComment;
  }

  async getComments(postId: number): Promise<(Comment & { author: User })[]> {
    const results = await db.select({
      comment: comments,
      user: users,
    })
      .from(comments)
      .innerJoin(users, eq(comments.userId, users.id))
      .where(eq(comments.postId, postId))
      .orderBy(desc(comments.createdAt));

    return results.map(r => ({ ...r.comment, author: r.user }));
  }

  async getConversations(userId: number): Promise<(Conversation & { otherUser: User, lastMessage?: Message })[]> {
    const convs = await db.select().from(conversations)
      .where(or(eq(conversations.participant1Id, userId), eq(conversations.participant2Id, userId)))
      .orderBy(desc(conversations.lastMessageAt));

    const enriched = [];
    for (const c of convs) {
      const otherId = c.participant1Id === userId ? c.participant2Id : c.participant1Id;
      const otherUser = await this.getUser(otherId);
      if (!otherUser) continue;

      const [lastMsg] = await db.select().from(messages)
        .where(eq(messages.conversationId, c.id))
        .orderBy(desc(messages.createdAt))
        .limit(1);

      enriched.push({
        ...c,
        otherUser,
        lastMessage: lastMsg
      });
    }
    return enriched;
  }

  async createConversation(user1Id: number, user2Id: number): Promise<Conversation> {
    // Check existing
    const [existing] = await db.select().from(conversations)
      .where(or(
        and(eq(conversations.participant1Id, user1Id), eq(conversations.participant2Id, user2Id)),
        and(eq(conversations.participant1Id, user2Id), eq(conversations.participant2Id, user1Id))
      ));

    if (existing) return existing;

    const [conv] = await db.insert(conversations).values({
      participant1Id: user1Id,
      participant2Id: user2Id
    }).returning();
    return conv;
  }

  async getMessages(conversationId: number): Promise<Message[]> {
    return db.select().from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
  }

  async createMessage(message: InsertMessage & { senderId: number }): Promise<Message> {
    const [msg] = await db.insert(messages).values(message).returning();

    // Update conversation lastMessageAt
    await db.update(conversations)
      .set({ lastMessageAt: new Date() })
      .where(eq(conversations.id, message.conversationId));

    return msg;
  }

  async createBoard(board: { userId: number, title: string }): Promise<Board> {
    const [newBoard] = await db.insert(boards).values(board).returning();
    return newBoard;
  }

  async getBoard(id: number): Promise<Board | undefined> {
    const [board] = await db.select().from(boards).where(eq(boards.id, id));
    return board;
  }

  async getBoards(userId: number): Promise<Board[]> {
    return db.select().from(boards).where(eq(boards.userId, userId)).orderBy(desc(boards.updatedAt));
  }

  async updateBoard(id: number, data: Partial<Board>): Promise<Board> {
    const [updated] = await db.update(boards)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(boards.id, id))
      .returning();
    return updated;
  }
}

// Helper to fix missing import
import { not } from "drizzle-orm";

export const storage = new DatabaseStorage();
