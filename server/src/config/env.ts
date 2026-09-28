import { z } from 'zod';
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { resolve } from 'path';

config();
config({ path: resolve(process.cwd(), 'server/.env') });
config({ path: resolve(process.cwd(), '../.env') });

const envSchema = z.object({
  // GitHub App
  GITHUB_APP_ID: z.string().min(1, 'GITHUB_APP_ID is required'),
  GITHUB_PRIVATE_KEY_PATH: z.string().default('./private-key.pem'),
  GITHUB_WEBHOOK_SECRET: z.string().min(1, 'GITHUB_WEBHOOK_SECRET is required'),
  // GitHub OAuth (same App — Client ID + Secret from App settings)
  GITHUB_CLIENT_ID: z.string().min(1, 'GITHUB_CLIENT_ID is required'),
  GITHUB_CLIENT_SECRET: z.string().min(1, 'GITHUB_CLIENT_SECRET is required'),
  GITHUB_APP_SLUG: z.string().min(1, 'GITHUB_APP_SLUG is required'),

  // Anthropic
  ANTHROPIC_API_KEY: z.string().min(1, 'ANTHROPIC_API_KEY is required'),

  // OpenAI (embeddings)
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required'),

  // Database
  DATABASE_URL: z.string().default('file:./codewarden.db'),

  // Server
  PORT: z.string().default('3001').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  SESSION_SECRET: z.string().default('codewarden-dev-secret-change-in-prod'),
  APP_URL: z.string().default('http://localhost:5173'),

  // ChromaDB
  CHROMA_URL: z.string().default('http://localhost:8000'),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    for (const issue of result.error.issues) {
      console.error(`   ${issue.path.join('.')}: ${issue.message}`);
    }
    console.error('\n📄 Copy .env.example to .env and fill in the required values.');
    process.exit(1);
  }

  return result.data;
}

export const env = loadEnv();

/**
 * Load the GitHub App private key from the file path specified in env.
 * Cached after first load.
 */
let _privateKey: string | null = null;

export function getGitHubPrivateKey(): string {
  if (!_privateKey) {
    const candidatePaths = [
      resolve(env.GITHUB_PRIVATE_KEY_PATH),
      resolve(process.cwd(), 'server', env.GITHUB_PRIVATE_KEY_PATH),
      resolve(process.cwd(), 'private-key.pem'),
      resolve(process.cwd(), 'server/private-key.pem'),
    ];

    for (const keyPath of candidatePaths) {
      try {
        _privateKey = readFileSync(keyPath, 'utf-8');
        break;
      } catch {
        // try next
      }
    }

    if (!_privateKey) {
      console.error(`❌ Could not read GitHub private key from: ${candidatePaths[0]}`);
      console.error('   Download the private key from your GitHub App settings.');
      process.exit(1);
    }
  }
  return _privateKey;
}
