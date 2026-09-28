import { App } from '@octokit/app';
import { env, getGitHubPrivateKey } from '../config/env.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('github-app');

let _app: App | null = null;

/**
 * Get the singleton GitHub App instance.
 */
export function getGitHubApp(): App {
  if (!_app) {
    _app = new App({
      appId: env.GITHUB_APP_ID,
      privateKey: getGitHubPrivateKey(),
      webhooks: {
        secret: env.GITHUB_WEBHOOK_SECRET,
      },
    });
    log.info('GitHub App initialized');
  }
  return _app;
}

/**
 * Get an authenticated Octokit instance for a specific installation.
 */
export async function getInstallationOctokit(installationId: number) {
  const app = getGitHubApp();
  return app.getInstallationOctokit(installationId);
}
