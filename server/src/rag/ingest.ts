import { ChromaClient } from 'chromadb';
import { prisma } from '../db.js';
import { generateEmbeddings, chromaEmbeddingFunction } from './embeddings.js';
import { env } from '../config/env.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('rag-ingest');

const chroma = new ChromaClient({ path: env.CHROMA_URL });

/** Target chunk size in characters (~400 tokens ≈ 1600 chars). */
const CHUNK_SIZE = 1600;
/** Overlap between chunks in characters (~50 tokens ≈ 200 chars). */
const CHUNK_OVERLAP = 200;

/**
 * Ingest a standards document: chunk it, embed it, store in ChromaDB.
 */
export async function ingestStandardsDoc(
  repoId: string,
  docId: string,
  filename: string,
  content: string
): Promise<number> {
  log.info({ repoId, docId, filename }, 'Ingesting standards document');

  // 1. Chunk the document
  const chunks = chunkDocument(content, filename);
  log.info({ chunkCount: chunks.length }, 'Document chunked');

  if (chunks.length === 0) {
    log.warn('Document produced no chunks');
    return 0;
  }

  // 2. Generate embeddings for all chunks
  const texts = chunks.map((c) => c.text);
  const embeddings = await generateEmbeddings(texts);

  // 3. Get or create ChromaDB collection for this repo
  const collectionName = `repo_${repoId}`;
  const collection = await chroma.getOrCreateCollection({
    name: collectionName,
    embeddingFunction: chromaEmbeddingFunction,
    metadata: { repoId },
  });

  // 4. Delete any existing chunks from this document (for re-indexing)
  try {
    await collection.delete({
      where: { docId: { $eq: docId } },
    });
  } catch {
    // Collection might be new, no existing docs to delete
  }

  // 5. Add chunks to the collection
  const ids = chunks.map((_, i) => `${docId}_chunk_${i}`);
  const metadatas = chunks.map((c) => ({
    docId,
    filename,
    chunkIndex: c.index,
    section: c.section || '',
  }));

  await collection.add({
    ids,
    embeddings,
    documents: texts,
    metadatas,
  });

  // 6. Update the document record
  await prisma.standardsDocument.update({
    where: { id: docId },
    data: { chunkCount: chunks.length },
  });

  log.info({ chunkCount: chunks.length }, 'Standards document ingested');
  return chunks.length;
}

interface Chunk {
  text: string;
  index: number;
  section?: string;
}

/**
 * Chunk a Markdown document using recursive text splitting.
 * Splits on headers first, then paragraphs, then sentences.
 */
function chunkDocument(content: string, _filename: string): Chunk[] {
  const chunks: Chunk[] = [];

  // Split by Markdown headers first
  const sections = content.split(/(?=^#{1,3}\s)/m);
  let chunkIndex = 0;

  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed) continue;

    // Extract section header if present
    const headerMatch = trimmed.match(/^(#{1,3})\s+(.+)/);
    const sectionTitle = headerMatch ? headerMatch[2] : undefined;

    if (trimmed.length <= CHUNK_SIZE) {
      // Section fits in one chunk
      chunks.push({
        text: trimmed,
        index: chunkIndex++,
        section: sectionTitle,
      });
    } else {
      // Split large sections into overlapping chunks
      const subChunks = splitWithOverlap(trimmed, CHUNK_SIZE, CHUNK_OVERLAP);
      for (const subChunk of subChunks) {
        chunks.push({
          text: subChunk,
          index: chunkIndex++,
          section: sectionTitle,
        });
      }
    }
  }

  return chunks;
}

/**
 * Split text into overlapping chunks by paragraph/sentence boundaries.
 */
function splitWithOverlap(text: string, maxSize: number, overlap: number): string[] {
  const chunks: string[] = [];

  // Split by paragraphs first
  const paragraphs = text.split(/\n\n+/);
  let current = '';

  for (const paragraph of paragraphs) {
    if (current.length + paragraph.length + 2 > maxSize && current.length > 0) {
      chunks.push(current.trim());
      // Carry over the overlap portion
      const words = current.split(/\s+/);
      const overlapWords = words.slice(-Math.ceil(overlap / 6)); // ~6 chars per word
      current = overlapWords.join(' ') + '\n\n' + paragraph;
    } else {
      current += (current ? '\n\n' : '') + paragraph;
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks;
}

/**
 * Delete all chunks for a document from ChromaDB.
 */
export async function deleteDocChunks(repoId: string, docId: string): Promise<void> {
  const collectionName = `repo_${repoId}`;
  try {
    const collection = await chroma.getCollection({
      name: collectionName,
      embeddingFunction: chromaEmbeddingFunction,
    });
    await collection.delete({
      where: { docId: { $eq: docId } },
    });
    log.info({ docId }, 'Document chunks deleted from ChromaDB');
  } catch {
    log.warn({ docId }, 'Could not delete document chunks (collection may not exist)');
  }
}
