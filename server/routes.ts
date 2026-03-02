import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { UsageService } from "./usage";
import { StudyModeService } from "./study-mode";
import { AnalyticsService } from "./analytics";
import { api } from "@shared/routes";
import { z } from "zod";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { hashPassword, comparePasswords } from "./auth";
import pgSession from "connect-pg-simple";
import { pool } from "./db";
import { WebSocketServer, WebSocket } from "ws";
import { ExpressPeerServer } from "peer";
import { db } from "./db";
import { users, posts, conversations, messages, type User as SchemaUser } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

declare module 'express-serve-static-core' {
  interface Request {
    user?: SchemaUser;
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const isServerless = !!process.env.VERCEL;
  // === PEER SERVER SETUP ===
  const peerServer = ExpressPeerServer(httpServer, {
    path: "/"
  });
  app.use("/peerjs", peerServer);

  // === AUTH SETUP ===
  const PostgresqlStore = pgSession(session);
  const sessionStore = new PostgresqlStore({
    pool,
    createTableIfMissing: true,
  });

  app.use(
    session({
      secret: process.env.SESSION_SECRET || "secret",
      resave: false,
      saveUninitialized: false,
      store: sessionStore,
      cookie: {
        secure: app.get("env") === "production",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: "Incorrect username." });
        }
        const isValid = await comparePasswords(password, user.password);
        if (!isValid) {
          return done(null, false, { message: "Incorrect password." });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Auth Middleware
  const isAuthenticated = (req: any, res: any, next: any) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Unauthorized" });
  };

  // Track usage for each API request
  const trackUsage = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated() || req.path.startsWith("/api/auth")) {
      return next();
    }

    const start = Date.now();
    const originalJson = res.json;

    res.json = function (bodyJson: any, ...args: any[]) {
      const duration = Date.now() - start;
      const userId = (req.user as any)?.id;

      if (userId && duration > 0) {
        // Fire and forget - don't wait for usage tracking to complete
        UsageService.trackRequest(userId, duration).catch((err) => {
          console.error("Failed to track usage:", err);
        });
      }

      return originalJson.apply(res, [bodyJson, ...args]);
    };

    return next();
  };

  // === ROUTES ===

  // Register middleware for tracking usage and checking lock status
  app.use("/api", trackUsage);

  // Middleware to check usage limits for authenticated routes (but not auth endpoints)
  app.use((req: any, res: any, next: any) => {
    // Skip auth endpoints
    if (req.path.match(/^\/api\/auth\/.*/)) {
      return next();
    }

    // For all other endpoints, check if authenticated and not locked
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    UsageService.isUserLocked((req.user as any).id).then((isLocked) => {
      if (isLocked) {
        return res.status(403).json({ message: "Daily usage limit exceeded. Come back tomorrow." });
      }
      next();
    }).catch((err) => {
      console.error("Error checking user lock status:", err);
      next();
    });
  });

  // Auth
  app.post(api.auth.register.path, async (req, res, next) => {
    try {
      const input = api.auth.register.input.parse(req.body);
      const existing = await storage.getUserByUsername(input.username);
      if (existing) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const hashedPassword = await hashPassword(input.password);
      const user = await storage.createUser({ ...input, password: hashedPassword });

      req.login(user, async (err) => {
        if (err) return next(err);

        // Initialize daily usage and start tracking session
        await UsageService.resetIfNewDay(user.id);
        UsageService.startSession(user.id);

        res.status(201).json({ id: user.id, username: user.username });
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        next(err);
      }
    }
  });

  app.post(api.auth.login.path, passport.authenticate("local"), async (req, res) => {
    const user = req.user as SchemaUser;

    // Reset usage if it's a new day and start tracking session
    await UsageService.resetIfNewDay(user.id);
    UsageService.startSession(user.id);

    res.status(200).json({ id: user.id, username: user.username });
  });

  app.post(api.auth.logout.path, (req, res, next) => {
    const userId = (req.user as any)?.id;

    req.logout((err) => {
      if (err) return next(err);

      // End tracking session
      if (userId) {
        UsageService.endSession(userId);
      }

      res.sendStatus(200);
    });
  });

  app.get(api.auth.me.path, (req, res) => {
    if (req.isAuthenticated()) {
      const { password, ...userWithoutPassword } = req.user as any;
      res.json(userWithoutPassword);
    } else {
      res.json(null);
    }
  });

  // Daily Usage Endpoints
  app.get("/api/usage", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const usage = await UsageService.getUserDailyUsage(userId);
      const remaining = await UsageService.getRemainingMinutes(userId);
      const unlockTime = await UsageService.getTimeUntilUnlock(userId);

      res.json({
        totalMinutes: usage?.totalMinutes || 0,
        isLocked: usage?.isLocked || false,
        remainingMinutes: remaining,
        unlockTime: unlockTime, // null if not locked, { hours, minutes } if locked
      });
    } catch (err) {
      console.error("Failed to get usage info:", err);
      res.status(500).json({ message: "Failed to get usage info" });
    }
  });

  // Study Mode Endpoints
  app.post("/api/study-mode/enable", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const success = await StudyModeService.enableStudyMode(userId);

      if (success) {
        res.json({ message: "Study mode enabled", studyModeEnabled: true });
      } else {
        res.status(500).json({ message: "Failed to enable study mode" });
      }
    } catch (err) {
      console.error("Failed to enable study mode:", err);
      res.status(500).json({ message: "Failed to enable study mode" });
    }
  });

  app.post("/api/study-mode/disable", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const success = await StudyModeService.disableStudyMode(userId);

      if (success) {
        res.json({ message: "Study mode disabled", studyModeEnabled: false });
      } else {
        res.status(500).json({ message: "Failed to disable study mode" });
      }
    } catch (err) {
      console.error("Failed to disable study mode:", err);
      res.status(500).json({ message: "Failed to disable study mode" });
    }
  });

  app.get("/api/study-mode/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const isEnabled = await StudyModeService.isStudyModeEnabled(userId);

      res.json({
        studyModeEnabled: isEnabled,
        allowedCategories: StudyModeService.STUDY_MODE_ALLOWED_CATEGORIES
      });
    } catch (err) {
      console.error("Failed to get study mode status:", err);
      res.status(500).json({ message: "Failed to get study mode status" });
    }
  });

  // Analytics Endpoints
  app.get("/api/analytics/screen-time", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const analytics = await AnalyticsService.getScreenTimeAnalytics(userId);
      res.json(analytics);
    } catch (err) {
      console.error("Failed to get screen time analytics:", err);
      res.status(500).json({ message: "Failed to get analytics" });
    }
  });

  app.get("/api/analytics/daily-breakdown", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const days = parseInt(req.query.days as string) || 30;
      const breakdown = await AnalyticsService.getDailyBreakdown(userId, Math.min(days, 365));
      res.json(breakdown);
    } catch (err) {
      console.error("Failed to get daily breakdown:", err);
      res.status(500).json({ message: "Failed to get daily breakdown" });
    }
  });

  app.get("/api/analytics/trend", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const period = (req.query.period as 'week' | 'month') || 'week';
      const trend = await AnalyticsService.getUsageTrend(userId, period);
      res.json(trend);
    } catch (err) {
      console.error("Failed to get usage trend:", err);
      res.status(500).json({ message: "Failed to get trend" });
    }
  });

  app.get("/api/analytics/goals", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const dailyLimit = parseInt(req.query.limit as string) || 120;
      const progress = await AnalyticsService.getGoalProgress(userId, dailyLimit);
      res.json(progress);
    } catch (err) {
      console.error("Failed to get goal progress:", err);
      res.status(500).json({ message: "Failed to get goal progress" });
    }
  });

  app.get("/api/analytics/health-score", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const score = await AnalyticsService.getHealthScore(userId);
      res.json({ score, max_score: 100 });
    } catch (err) {
      console.error("Failed to get health score:", err);
      res.status(500).json({ message: "Failed to get health score" });
    }
  });

  // Users
  app.get(api.users.search.path, isAuthenticated, async (req: any, res) => {
    const q = req.query.q as string;
    if (!q) return res.json([]);
    const users = await storage.searchUsers(q);
    res.json(users);
  });

  app.patch("/api/users/:id", isAuthenticated, async (req: any, res) => {
    const userId = Number(req.params.id);
    if ((req.user as any).id !== userId) return res.status(403).json({ message: "Forbidden" });

    const [updatedUser] = await db.update(users)
      .set(req.body)
      .where(eq(users.id, userId))
      .returning();

    res.json(updatedUser);
  });

  app.patch("/api/conversations/:id/missed-call", isAuthenticated, async (req: any, res) => {
    const convId = Number(req.params.id);
    const { fromId } = req.body;
    await db.update(conversations)
      .set({ missedCallFrom: fromId })
      .where(eq(conversations.id, convId));
    res.sendStatus(200);
  });

  app.patch("/api/conversations/:id/clear-missed-call", isAuthenticated, async (req: any, res) => {
    const convId = Number(req.params.id);
    await db.update(conversations)
      .set({ missedCallFrom: null })
      .where(eq(conversations.id, convId));
    res.sendStatus(200);
  });

  app.get(api.users.get.path, isAuthenticated, async (req: any, res) => {
    const user = await storage.getUserByUsername(req.params.username);
    if (!user) {
      // Try fuzzy search or case-insensitive if not found exactly
      const allUsers = await db.select().from(users);
      const fuzzyUser = allUsers.find(u => u.username.toLowerCase() === req.params.username.toLowerCase());
      if (!fuzzyUser) return res.status(404).json({ message: "User not found" });

      // Redirect or use fuzzyUser
      const followers = await storage.getFollowers(fuzzyUser.id);
      const following = await storage.getFollowing(fuzzyUser.id);
      const userPosts = await db.select().from(posts).where(eq(posts.userId, fuzzyUser.id)).orderBy(desc(posts.createdAt));

      return res.json({
        ...fuzzyUser,
        followerCount: followers.length,
        followingCount: following.length,
        followers,
        following,
        isFollowing: followers.some(f => f.id === (req.user as any).id),
        posts: userPosts
      });
    }

    // Add stats
    const followers = await storage.getFollowers(user.id);
    const following = await storage.getFollowing(user.id);
    const userPosts = await db.select().from(posts).where(eq(posts.userId, user.id)).orderBy(desc(posts.createdAt));

    const enriched = {
      ...user,
      followerCount: followers.length,
      followingCount: following.length,
      followers,
      following,
      isFollowing: followers.some(f => f.id === (req.user as any).id),
      posts: userPosts
    };

    res.json(enriched);
  });

  app.post(api.users.follow.path, isAuthenticated, async (req: any, res) => {
    await storage.followUser((req.user as any).id, Number(req.params.id));
    res.sendStatus(200);
  });

  app.post(api.users.unfollow.path, isAuthenticated, async (req: any, res) => {
    await storage.unfollowUser((req.user as any).id, Number(req.params.id));
    res.sendStatus(200);
  });

  // Posts
  app.get(api.posts.list.path, isAuthenticated, async (req: any, res) => {
    const feed = (req.query.feed as 'latest' | 'following' | 'popular') || 'latest';
    const userId = (req.user as any).id;
    const studyModeEnabled = await StudyModeService.isStudyModeEnabled(userId);
    const posts = await storage.getPosts(userId, feed, studyModeEnabled);
    res.json(posts);
  });

  app.post(api.posts.create.path, isAuthenticated, async (req: any, res) => {
    const input = api.posts.create.input.parse(req.body);
    const post = await storage.createPost({ ...input, userId: (req.user as any).id });

    // Fetch details to return full object
    const [fullPost] = await storage.getPosts((req.user as any).id, 'latest'); // Hack to get enriched post quickly
    // Better: implement getPostWithDetails
    res.status(201).json(fullPost || post);
  });

  app.delete(api.posts.delete.path, isAuthenticated, async (req: any, res) => {
    const post = await storage.getPost(Number(req.params.id));
    if (!post) return res.status(404).json({ message: "Not found" });
    if (post.userId !== (req.user as any).id) return res.status(403).json({ message: "Forbidden" });

    await storage.deletePost(post.id);
    res.sendStatus(200);
  });

  app.post(api.posts.like.path, isAuthenticated, async (req: any, res) => {
    await storage.likePost((req.user as any).id, Number(req.params.id));
    res.json({ success: true });
  });

  app.post(api.posts.unlike.path, isAuthenticated, async (req: any, res) => {
    await storage.unlikePost((req.user as any).id, Number(req.params.id));
    res.json({ success: true });
  });

  app.post(api.posts.repost.path, isAuthenticated, async (req: any, res) => {
    const input = req.body; // optional content
    await storage.repostPost({
      postId: Number(req.params.id),
      userId: (req.user as any).id,
      content: input.content
    });
    res.json({ success: true });
  });

  app.get(api.posts.getComments.path, isAuthenticated, async (req: any, res) => {
    const comments = await storage.getComments(Number(req.params.id));
    res.json(comments);
  });

  app.post(api.posts.addComment.path, isAuthenticated, async (req: any, res) => {
    const input = api.posts.addComment.input.parse(req.body);
    const comment = await storage.createComment({
      ...input,
      postId: Number(req.params.id),
      userId: (req.user as any).id
    });
    const user = await storage.getUser((req.user as any).id);
    res.status(201).json({ ...comment, author: user });
  });

  // Chat
  app.get(api.chat.list.path, isAuthenticated, async (req: any, res) => {
    const convs = await storage.getConversations((req.user as any).id);
    res.json(convs);
  });

  app.post(api.chat.start.path, isAuthenticated, async (req: any, res) => {
    const { participantId } = req.body;
    if ((req.user as any).id === Number(participantId)) {
      return res.status(400).json({ message: "You cannot message yourself" });
    }
    const conv = await storage.createConversation((req.user as any).id, Number(participantId));
    res.status(201).json(conv);
  });

  app.get(api.chat.getMessages.path, isAuthenticated, async (req: any, res) => {
    const msgs = await storage.getMessages(Number(req.params.id));
    res.json(msgs);
  });

  app.post(api.chat.sendMessage.path, isAuthenticated, async (req: any, res) => {
    const input = api.chat.sendMessage.input.parse(req.body);
    const msg = await storage.createMessage({
      ...input,
      conversationId: Number(req.params.id),
      senderId: (req.user as any).id
    });

    // Broadcast via WS
    if (typeof broadcastMessage === 'function') {
      broadcastMessage(msg);
    }

    res.status(201).json(msg);
  });

  app.delete("/api/conversations/:id", isAuthenticated, async (req: any, res) => {
    const convId = Number(req.params.id);
    const conv = await db.select().from(conversations).where(eq(conversations.id, convId)).limit(1);
    if (!conv.length) return res.status(404).json({ message: "Not found" });
    if (conv[0].participant1Id !== (req.user as any).id && conv[0].participant2Id !== (req.user as any).id) {
      return res.status(403).json({ message: "Forbidden" });
    }

    await db.delete(messages).where(eq(messages.conversationId, convId));
    await db.delete(conversations).where(eq(conversations.id, convId));
    res.sendStatus(200);
  });

  // Boards
  app.get("/api/boards", isAuthenticated, async (req: any, res) => {
    const results = await storage.getBoards((req.user as any).id);
    res.json(results);
  });

  app.post("/api/boards", isAuthenticated, async (req: any, res) => {
    const { title } = req.body;
    const board = await storage.createBoard({ userId: (req.user as any).id, title });
    res.status(201).json(board);
  });

  app.get("/api/boards/:id", isAuthenticated, async (req: any, res) => {
    const board = await storage.getBoard(Number(req.params.id));
    if (!board) return res.status(404).json({ message: "Board not found" });
    res.json(board);
  });

  app.patch("/api/boards/:id", isAuthenticated, async (req: any, res) => {
    const board = await storage.updateBoard(Number(req.params.id), req.body);
    res.json(board);
  });

  app.post("/api/conversations/:id/call-log", isAuthenticated, async (req: any, res) => {
    const { type } = req.body;
    const convId = Number(req.params.id);
    let content = "Voice call ended";
    if (type === 'missed') content = "Missed voice call";
    if (type === 'missed_video') content = "Missed video call";
    if (type === 'ended_video') content = "Video call ended";

    const msg = await storage.createMessage({
      conversationId: convId,
      senderId: (req.user as any).id,
      content
    });
    if (typeof broadcastMessage === 'function') {
      broadcastMessage(msg);
    }
    res.status(201).json(msg);
  });

  // === WEBSOCKET SETUP ===
  // Skip WebSocket setup in serverless environments (Vercel) - requires persistent connections
  let broadcastMessage: (msg: any) => void = (_msg: any) => { }; // no-op by default

  if (!isServerless) {
    const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

    // Map userId to WebSocket connection
    const clients = new Map<number, WebSocket>();
    const boardRooms = new Map<number, Set<WebSocket>>();

    wss.on('connection', (ws, req) => {
      let currentBoardId: number | null = null;

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());

        if (message.type === 'auth') {
          const userId = message.userId;
          console.log(`WS: User ${userId} authenticated`);
          clients.set(userId, ws);
        }

        if (message.type === 'join-board') {
          const boardId = Number(message.boardId);
          currentBoardId = boardId;
          console.log(`WS: User joined board ${boardId}`);
          if (!boardRooms.has(boardId)) boardRooms.set(boardId, new Set());
          boardRooms.get(boardId)!.add(ws);
        }

        if (message.type === 'board-update') {
          console.log(`WS: Board ${currentBoardId} update received`);
          if (currentBoardId && boardRooms.has(currentBoardId)) {
            const room = boardRooms.get(currentBoardId)!;
            console.log(`WS: Broadcasting update to ${room.size - 1} other clients`);
            const payload = JSON.stringify(message);
            room.forEach(client => {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(payload);
              }
            });
          }
        }
      });

      ws.on('close', () => {
        // Remove from clients map
        clients.forEach((socket, clientId) => {
          if (socket === ws) clients.delete(clientId);
        });

        // Remove from board rooms
        if (currentBoardId && boardRooms.has(currentBoardId)) {
          boardRooms.get(currentBoardId)!.delete(ws);
          if (boardRooms.get(currentBoardId)!.size === 0) {
            boardRooms.delete(currentBoardId);
          }
        }
      });
    });

    broadcastMessage = (msg: any) => {
      const payload = JSON.stringify({ type: 'message', message: msg });
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(payload);
        }
      });
    };
  }

  // Seed Data
  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  const existing = await storage.getUserByUsername("demo");
  if (!existing) {
    const password = await hashPassword("password");
    const demoUser = await storage.createUser({
      username: "demo",
      password,
      displayName: "Demo User",
      bio: "Just a demo user exploring this text-based world.",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=demo"
    });

    const otherUser = await storage.createUser({
      username: "alice",
      password,
      displayName: "Alice Wonderland",
      bio: "Curiouser and curiouser!",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=alice"
    });

    await storage.createPost({
      userId: demoUser.id,
      content: "Hello world! This is my first thought here.",
      fontStyle: "Inter",
      backgroundColor: "#ffffff"
    });

    await storage.createPost({
      userId: otherUser.id,
      content: "I love the minimalist vibe of this app. #clean",
      fontStyle: "Lora",
      backgroundColor: "#f0f9ff"
    });

    await storage.followUser(demoUser.id, otherUser.id);
  }
}
