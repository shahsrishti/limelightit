import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { globalErrorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';
import { env } from './config/env';

// Routes
import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import { HealthController } from './controllers/health.controller';
import { verifyJwt } from './middleware/auth.middleware';

const app: Application = express();
const healthController = new HealthController();

// Global Middlewares
app.use(helmet());
app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(compression());

// Rate Limiting — global API limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.NODE_ENV === 'development' ? 10000 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' }
});
app.use('/api', limiter);

// Stricter rate limiter for authentication endpoints (brute-force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.NODE_ENV === 'development' ? 1000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts, please try again later.' }
});
app.use('/api/v1/auth/login', authLimiter);

// Request Logging
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`=> ${req.method} ${req.url}`);
  next();
});

// Routes
app.get('/api/v1/health', healthController.getHealth.bind(healthController));
app.get('/api/v1/monitoring', verifyJwt as any, healthController.getMonitoring.bind(healthController));
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1', adminRoutes);

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    errors: null,
    timestamp: new Date().toISOString(),
  });
});

// Global Error Handler
app.use(globalErrorHandler);

export default app;
