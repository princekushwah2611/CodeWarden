import { ChromaClient } from 'chromadb';
import { generateEmbedding, chromaEmbeddingFunction } from './embeddings.js';
import { env } from '../config/env.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('rag-retrieve');

const chroma = new ChromaClient({ path: env.CHROMA_URL });

/** Minimum relevance score to include a chunk. */
const RELEVANCE_THRESHOLD = 0.7;
/** Maximum number of chunks to retrieve. */
const TOP_K = 5;

export interface RetrievedChunk {
  text: string;
  docId: string;
  filename: string;
  section: string;
  score: number;
}

/**
 * Retrieve relevant standards chunks for a given code diff.
 */
export async function retrieveRelevantStandards(
  repoId: string,
  query: string
): Promise<RetrievedChunk[]> {
  const collectionName = `repo_${repoId}`;

  log.debug({ repoId, queryLength: query.length }, 'Retrieving relevant standards');

  try {
    const collection = await chroma.getCollection({
      name: collectionName,
      embeddingFunction: chromaEmbeddingFunction,
    });

    // Embed the query
    const queryEmbedding = await generateEmbedding(query);

    // Query ChromaDB
    const results = await collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: TOP_K,
    });

    if (!results.documents || !results.documents[0]) {
      return [];
    }

    const chunks: RetrievedChunk[] = [];

    for (let i = 0; i < results.documents[0].length; i++) {
      const document = results.documents[0][i];
      const metadata = results.metadatas?.[0]?.[i] as Record<string, string> | undefined;
      const distance = results.distances?.[0]?.[i];

      // ChromaDB returns distances (lower = more similar for cosine)
      // Convert distance to similarity score
      const score = distance !== undefined ? 1 - distance : 0;

      if (score < RELEVANCE_THRESHOLD) continue;

      chunks.push({
        text: document || '',
        docId: metadata?.docId || '',
        filename: metadata?.filename || '',
        section: metadata?.section || '',
        score,
      });
    }

    log.info(
      { repoId, retrieved: chunks.length, totalResults: results.documents[0].length },
      'Standards chunks retrieved'
    );

    return chunks;
  } catch (error) {
    log.warn({ error, repoId }, 'Could not retrieve standards (collection may not exist)');
    return [];
  }
}
