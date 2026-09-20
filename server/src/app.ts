import express from 'express';
import cors from 'cors';
import documentRoutes from './routes/documentRoutes';
import authRoutes from './routes/authRoutes';
import { authMiddleware } from './middleware/authMiddleware';
import { errorHandler } from './middleware/errorHandler';

export const createApp = () => {
  const app = express();

  // Configure CORS
  const allowedOrigin = process.env.CLIENT_URL || 'http://localhost:5173';
  app.use(
    cors({
      origin: allowedOrigin,
      credentials: true,
    })
  );

  // Parse JSON bodies with generous limit for annotations payload
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Authentication Routes (public login, protected verify)
  app.use('/api/auth', authRoutes);

  // API Routes protected by 30-day authentication
  app.use('/api/documents', authMiddleware, documentRoutes);

  // Centralized error handler
  app.use(errorHandler);

  return app;
};
