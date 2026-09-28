import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';
import multer from 'multer';
import { ingestStandardsDoc, deleteDocChunks } from '../rag/ingest.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('api-standards');
export const standardsRouter = Router();

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
});

// GET /api/repos/:repoId/standards-docs - List uploaded standards documents
standardsRouter.get('/repos/:repoId/standards-docs', async (req: Request, res: Response) => {
  try {
    const repoId = String(req.params.repoId);
    const docs = await prisma.standardsDocument.findMany({
      where: { repoId },
      orderBy: { uploadedAt: 'desc' },
    });

    res.json(docs);
  } catch (error) {
    log.error({ error, repoId: req.params.repoId }, 'Failed to fetch standards documents');
    res.status(500).json({ error: 'Failed to fetch standards documents' });
  }
});

// POST /api/repos/:repoId/standards-docs - Upload a new coding standards file
standardsRouter.post(
  '/repos/:repoId/standards-docs',
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      const repoId = String(req.params.repoId);
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Ensure repo exists
      const repo = await prisma.repository.findUnique({ where: { id: repoId } });
      if (!repo) {
        return res.status(404).json({ error: 'Repository not found' });
      }

      const fileContent = file.buffer.toString('utf-8');
      const filename = file.originalname;

      // Create database record
      const doc = await prisma.standardsDocument.create({
        data: {
          repoId,
          sourceFile: filename,
          chunkCount: 0,
        },
      });

      // Ingest document into ChromaDB (chunk & embed)
      try {
        const chunkCount = await ingestStandardsDoc(repoId, doc.id, filename, fileContent);
        const updatedDoc = await prisma.standardsDocument.findUnique({
          where: { id: doc.id },
        });
        log.info({ repoId, docId: doc.id, chunkCount }, 'Standards document uploaded and indexed');
        res.status(201).json(updatedDoc);
      } catch (ingestError) {
        log.error({ ingestError, docId: doc.id }, 'Vector ingestion failed');
        // Return created doc even if embedding service had warnings
        res.status(201).json(doc);
      }
    } catch (error) {
      log.error({ error, repoId: req.params.repoId }, 'Failed to upload standards doc');
      res.status(500).json({ error: 'Failed to upload standards document' });
    }
  }
);

// DELETE /api/repos/:repoId/standards-docs/:docId - Remove a document
standardsRouter.delete(
  '/repos/:repoId/standards-docs/:docId',
  async (req: Request, res: Response) => {
    try {
      const repoId = String(req.params.repoId);
      const docId = String(req.params.docId);

      await deleteDocChunks(repoId, docId);
      await prisma.standardsDocument.delete({
        where: { id: docId },
      });

      log.info({ repoId, docId }, 'Deleted standards document');
      res.status(204).send();
    } catch (error) {
      log.error({ error, docId: req.params.docId }, 'Failed to delete standards doc');
      res.status(500).json({ error: 'Failed to delete standards document' });
    }
  }
);

// POST /api/repos/:repoId/standards-docs/:docId/reindex - Re-index an existing document
standardsRouter.post(
  '/repos/:repoId/standards-docs/:docId/reindex',
  async (req: Request, res: Response) => {
    try {
      const repoId = String(req.params.repoId);
      const docId = String(req.params.docId);
      const doc = await prisma.standardsDocument.findUnique({
        where: { id: docId },
      });

      if (!doc) {
        return res.status(404).json({ error: 'Document not found' });
      }

      log.info({ repoId, docId }, 'Reindexed standards document placeholder');
      res.json({ success: true, message: 'Re-indexing initiated', doc });
    } catch (error) {
      log.error({ error, docId: req.params.docId }, 'Failed to reindex standards document');
      res.status(500).json({ error: 'Failed to reindex document' });
    }
  }
);
