import OpenAI from 'openai';
import { env } from '../config/env.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('embeddings');

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;

/**
 * Generate embeddings for a list of texts using OpenAI.
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  log.debug({ textCount: texts.length }, 'Generating embeddings');

  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: texts,
    });

    return response.data.map((d) => d.embedding);
  } catch (error) {
    log.error({ error }, 'Failed to generate embeddings');
    throw error;
  }
}

/**
 * Generate a single embedding for a text.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const embeddings = await generateEmbeddings([text]);
  return embeddings[0];
}

export { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL };

export const chromaEmbeddingFunction = {
  generate: generateEmbeddings,
};
