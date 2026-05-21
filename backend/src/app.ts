import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import * as dotenv from 'dotenv';

import authRoutes from './routes/auth';
import billingRoutes from './routes/billing';
import projectRoutes from './routes/projects';
import adminRoutes from './routes/admin';

dotenv.config();

const app = express();

function buildAllowedOrigins(): Set<string> {
  const defaults = new Set<string>([
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
  ]);
  const frontendUrl = (process.env.FRONTEND_URL || '').trim();
  if (frontendUrl) defaults.add(frontendUrl.replace(/\/+$/, ''));
  const configured = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
  for (const origin of configured) defaults.add(origin.replace(/\/+$/, ''));
  return defaults;
}

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      "font-src": ["'self'", "https://fonts.gstatic.com"],
      "connect-src": ["'self'", "ws:", "wss:"]
    }
  }
}));

// CORS configuration
const allowedOrigins = buildAllowedOrigins();
app.use(cors({
  origin: (origin, callback) => {
    // Non-browser tools (curl/postman) may omit origin
    if (!origin) return callback(null, true);
    const normalized = origin.replace(/\/+$/, '');
    if (allowedOrigins.has(normalized)) return callback(null, true);
    if (process.env.NODE_ENV !== 'production') return callback(null, true);
    return callback(new Error(`Origin not allowed by CORS: ${origin}`));
  },
  credentials: true,
  optionsSuccessStatus: 200
}));

// Request parsing middleware
app.use(express.json({
  limit: '10mb',
  verify: (req, _res, buf) => {
    (req as any).rawBody = buf.toString('utf8');
  },
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Logging middleware
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// API routes
app.use('/auth', authRoutes);
app.use('/billing', billingRoutes);
app.use('/projects', projectRoutes);
app.use('/admin', adminRoutes);
app.use('/api/admin', adminRoutes);

// Global error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { details: err.message })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

export default app;