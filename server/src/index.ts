import express from 'express';
import cors from 'cors';
import session from 'express-session';
import { createNodeMiddleware } from '@octokit/webhooks';
import { env } from './config/env.js';
import { getGitHubApp } from './github/app.js';
import { registerWebhookHandlers } from './github/webhooks.js';
import { apiRouter } from './api/routes.js';
import { logger } from './utils/logger.js';

const app = express();

// 1. Trust proxy (needed for correct proto/host in OAuth redirect URIs)
app.set('trust proxy', 1);

// 2. Session middleware (must be before routes)
app.use(
  session({
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: 'lax',
    },
  })
);

// 3. Configure GitHub App Webhook middleware
// Note: Webhook middleware MUST be mounted before express.json() to handle raw stream verification
try {
  const githubApp = getGitHubApp();
  registerWebhookHandlers();
  app.use(createNodeMiddleware(githubApp.webhooks, { path: '/api/webhooks/github' }));
  logger.info('GitHub webhook endpoint mounted at /api/webhooks/github');
} catch (ghInitError) {
  logger.warn({ ghInitError }, 'GitHub App initialization deferred (credentials may not be configured yet)');
}

// 4. Standard Middlewares
app.use(
  cors({
    origin: env.APP_URL,
    credentials: true, // required to send cookies cross-origin
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, _res, next) => {
  if (!req.path.startsWith('/api/webhooks')) {
    logger.debug({ method: req.method, path: req.path }, 'Incoming HTTP Request');
  }
  next();
});

// 5. Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'CodeWarden Server',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// 6. REST API Routes
app.use('/api', apiRouter);

// 7. 404 Handler for API
app.use('/api/*', (_req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// 8. Global Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err }, 'Unhandled server error');
  res.status(500).json({ error: 'Internal server error' });
});

// 9. Start Server
const server = app.listen(env.PORT, () => {
  logger.info(`🛡️ CodeWarden Server running on http://localhost:${env.PORT}`);
  logger.info(`Environment: ${env.NODE_ENV}`);
});

// Graceful shutdown
const shutdown = (signal: string) => {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  server.close(() => {
    logger.info('HTTP server closed.');
    process.exit(0);
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

export default app;
