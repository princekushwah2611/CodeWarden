import { Router, Request, Response } from 'express';
import { env } from '../config/env.js';
import { prisma } from '../db.js';
import { createLogger } from '../utils/logger.js';
import crypto from 'crypto';

const log = createLogger('api-auth');
export const authRouter = Router();

// --- Types ----------------------------------------------------------------

declare module 'express-session' {
  interface SessionData {
    userId?: string;
    githubLogin?: string;
    githubAvatarUrl?: string;
    oauthState?: string;
  }
}

// --- Helpers --------------------------------------------------------------

/** Generate a cryptographically random state parameter for CSRF protection. */
function generateState(): string {
  return crypto.randomBytes(16).toString('hex');
}

// --- Routes ---------------------------------------------------------------

/**
 * GET /api/auth/github
 * Redirects the browser to GitHub OAuth authorization page.
 */
authRouter.get('/github', (req: Request, res: Response) => {
  const state = generateState();
  req.session.oauthState = state;

  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    redirect_uri: `${req.protocol}://${req.get('host')}/api/auth/github/callback`,
    scope: 'read:user user:email',
    state,
  });

  const authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;
  log.info('Redirecting to GitHub OAuth');
  res.redirect(authUrl);
});

/**
 * GET /api/auth/github/callback
 * Handles the OAuth callback from GitHub, exchanges the code for a token,
 * fetches user info, and persists the session.
 */
authRouter.get('/github/callback', async (req: Request, res: Response) => {
  const { code, state } = req.query as { code?: string; state?: string };
  const frontendUrl = env.APP_URL;

  // Validate state (CSRF protection)
  if (!state || state !== req.session.oauthState) {
    log.warn('OAuth state mismatch — possible CSRF attempt');
    return res.redirect(`${frontendUrl}?error=state_mismatch`);
  }

  if (!code) {
    log.warn('Missing OAuth code');
    return res.redirect(`${frontendUrl}?error=missing_code`);
  }

  try {
    // 1. Exchange code for access token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: `${req.protocol}://${req.get('host')}/api/auth/github/callback`,
      }),
    });

    const tokenData = (await tokenRes.json()) as { access_token?: string; error?: string };

    if (!tokenData.access_token) {
      log.error({ tokenData }, 'GitHub token exchange failed');
      return res.redirect(`${frontendUrl}?error=token_exchange_failed`);
    }

    // 2. Fetch GitHub user profile
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: 'application/vnd.github+json',
      },
    });

    const githubUser = (await userRes.json()) as {
      id: number;
      login: string;
      name?: string;
      avatar_url: string;
      email?: string;
    };

    // 3. Upsert user in database
    const user = await prisma.user.upsert({
      where: { githubId: githubUser.id },
      update: {
        login: githubUser.login,
        name: githubUser.name ?? githubUser.login,
        avatarUrl: githubUser.avatar_url,
        accessToken: tokenData.access_token,
      },
      create: {
        githubId: githubUser.id,
        login: githubUser.login,
        name: githubUser.name ?? githubUser.login,
        avatarUrl: githubUser.avatar_url,
        accessToken: tokenData.access_token,
      },
    });

    // 4. Save to session
    req.session.userId = user.id;
    req.session.githubLogin = user.login;
    req.session.githubAvatarUrl = user.avatarUrl;
    delete req.session.oauthState;

    log.info({ login: user.login }, 'User authenticated via GitHub OAuth');

    // 5. Redirect to dashboard — they can install the App from there
    res.redirect(`${frontendUrl}/auth/success`);
  } catch (error) {
    log.error({ error }, 'OAuth callback failed');
    res.redirect(`${frontendUrl}?error=server_error`);
  }
});

/**
 * GET /api/auth/me
 * Returns the currently signed-in user, or 401 if not authenticated.
 */
authRouter.get('/me', async (req: Request, res: Response) => {
  if (!req.session.userId) {
    return res.status(401).json({ authenticated: false });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.session.userId },
      select: { id: true, login: true, name: true, avatarUrl: true, createdAt: true },
    });

    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({ authenticated: false });
    }

    res.json({ authenticated: true, user });
  } catch (error) {
    log.error({ error }, 'Failed to fetch current user');
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

/**
 * POST /api/auth/logout
 * Destroys the session and logs the user out.
 */
authRouter.post('/logout', (req: Request, res: Response) => {
  const login = req.session.githubLogin;
  req.session.destroy((err) => {
    if (err) {
      log.error({ err }, 'Failed to destroy session');
      return res.status(500).json({ error: 'Failed to logout' });
    }
    log.info({ login }, 'User logged out');
    res.json({ success: true });
  });
});

/**
 * GET /api/auth/install-url
 * Returns the GitHub App installation URL so the frontend can redirect the user.
 */
authRouter.get('/install-url', (_req: Request, res: Response) => {
  const installUrl = `https://github.com/apps/${env.GITHUB_APP_SLUG}/installations/new`;
  res.json({ url: installUrl });
});
