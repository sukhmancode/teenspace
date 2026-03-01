import { z } from 'zod';
import { insertUserSchema, insertPostSchema, insertCommentSchema, insertMessageSchema, insertRepostSchema } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  auth: {
    register: {
      method: 'POST' as const,
      path: '/api/register',
      input: insertUserSchema,
      responses: {
        201: z.object({ id: z.number(), username: z.string() }),
        400: errorSchemas.validation,
      },
    },
    login: {
      method: 'POST' as const,
      path: '/api/login',
      input: z.object({ username: z.string(), password: z.string() }),
      responses: {
        200: z.object({ id: z.number(), username: z.string() }),
        401: z.object({ message: z.string() }),
      },
    },
    logout: {
      method: 'POST' as const,
      path: '/api/logout',
      responses: {
        200: z.void(),
      },
    },
    me: {
      method: 'GET' as const,
      path: '/api/user',
      responses: {
        200: z.object({ id: z.number(), username: z.string() }).nullable(),
      },
    },
  },
  users: {
    get: {
      method: 'GET' as const,
      path: '/api/users/:username',
      responses: {
        200: z.any(), // UserWithDetails
        404: errorSchemas.notFound,
      },
    },
    follow: {
      method: 'POST' as const,
      path: '/api/users/:id/follow',
      responses: {
        200: z.void(),
      },
    },
    unfollow: {
      method: 'POST' as const,
      path: '/api/users/:id/unfollow',
      responses: {
        200: z.void(),
      },
    },
    search: {
      method: 'GET' as const,
      path: '/api/users',
      input: z.object({ q: z.string() }),
      responses: {
        200: z.array(z.any()),
      },
    },
  },
  posts: {
    list: {
      method: 'GET' as const,
      path: '/api/posts',
      input: z.object({ 
        feed: z.enum(['latest', 'following', 'popular']).optional().default('latest'),
      }).optional(),
      responses: {
        200: z.array(z.any()), // Array<PostWithDetails>
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/posts',
      input: insertPostSchema,
      responses: {
        201: z.any(), // PostWithDetails
        401: errorSchemas.internal,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/posts/:id',
      responses: {
        200: z.void(),
        403: errorSchemas.internal,
      },
    },
    like: {
      method: 'POST' as const,
      path: '/api/posts/:id/like',
      responses: {
        200: z.any(), // Updated PostWithDetails
      },
    },
    unlike: {
      method: 'POST' as const,
      path: '/api/posts/:id/unlike',
      responses: {
        200: z.any(), // Updated PostWithDetails
      },
    },
    repost: {
      method: 'POST' as const,
      path: '/api/posts/:id/repost',
      input: insertRepostSchema.pick({ content: true }).optional(),
      responses: {
        200: z.any(),
      },
    },
    getComments: {
      method: 'GET' as const,
      path: '/api/posts/:id/comments',
      responses: {
        200: z.array(z.any()),
      },
    },
    addComment: {
      method: 'POST' as const,
      path: '/api/posts/:id/comments',
      input: insertCommentSchema.pick({ content: true }),
      responses: {
        201: z.any(),
      },
    },
  },
  chat: {
    list: {
      method: 'GET' as const,
      path: '/api/conversations',
      responses: {
        200: z.array(z.any()), // ConversationWithDetails
      },
    },
    start: {
      method: 'POST' as const,
      path: '/api/conversations',
      input: z.object({ participantId: z.number() }),
      responses: {
        201: z.any(), // ConversationWithDetails
      },
    },
    getMessages: {
      method: 'GET' as const,
      path: '/api/conversations/:id/messages',
      responses: {
        200: z.array(z.any()),
      },
    },
    sendMessage: {
      method: 'POST' as const,
      path: '/api/conversations/:id/messages',
      input: insertMessageSchema.pick({ content: true }),
      responses: {
        201: z.any(),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url = url.replace(`:${key}`, String(value));
    });
  }
  return url;
}
