import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { authMiddleware } from './middleware/auth';
import { authRoutes } from './routes/auth';
import { userRoutes } from './routes/users';
import { albumRoutes } from './routes/albums';
import { imageRoutes, albumImageRoutes } from './routes/images';
import { feedbackRoutes } from './routes/feedback';

const PORT = parseInt(process.env.PORT || '3001', 10);

const app = new Elysia()
  .use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  }))
  .use(swagger({
    documentation: {
      info: {
        title: 'Suipic API',
        version: '0.1.0',
        description: 'Photo proofing API for photographers and clients',
      },
      tags: [
        { name: 'Auth', description: 'Authentication endpoints' },
        { name: 'Users', description: 'User management' },
        { name: 'Albums', description: 'Album management' },
        { name: 'Images', description: 'Image management' },
        { name: 'Feedback', description: 'Ratings, flags, and comments' },
      ],
    },
    path: '/docs',
  }))
  .get('/health', () => ({ status: 'ok', timestamp: new Date().toISOString() }))
  .use(authMiddleware)
  .use(authRoutes)
  .use(userRoutes)
  .use(albumRoutes)
  .use(imageRoutes)
  .use(albumImageRoutes)
  .use(feedbackRoutes)
  .listen(PORT);
console.log(`🦊 Suipic API running at http://localhost:${PORT}`);
console.log(`📚 Swagger docs at http://localhost:${PORT}/docs`);

export type App = typeof app;
