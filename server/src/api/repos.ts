import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';
import { z } from 'zod';
import { createLogger } from '../utils/logger.js';

const log = createLogger('api-repos');
export const reposRouter = Router();

// GET /api/repos - List all repositories with review and doc counts
reposRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const repos = await prisma.repository.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            reviews: true,
            standardsDocs: true,
          },
        },
      },
    });

    res.json(repos);
  } catch (error) {
    log.error({ error }, 'Failed to fetch repositories');
    res.status(500).json({ error: 'Failed to fetch repositories' });
  }
});

// GET /api/repos/:id - Get a single repository
reposRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const repo = await prisma.repository.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            reviews: true,
            standardsDocs: true,
          },
        },
      },
    });

    if (!repo) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    res.json(repo);
  } catch (error) {
    log.error({ error, id: req.params.id }, 'Failed to fetch repository');
    res.status(500).json({ error: 'Failed to fetch repository' });
  }
});

const updateSettingsSchema = z.object({
  severityThreshold: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  autoApprove: z.boolean().optional(),
  ignoredPatterns: z.string().optional(),
});

// PATCH /api/repos/:id/settings - Update repo review thresholds & settings
reposRouter.patch('/:id/settings', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const parseResult = updateSettingsSchema.safeParse(req.body);

    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid settings payload',
        details: parseResult.error.flatten(),
      });
    }

    const updated = await prisma.repository.update({
      where: { id },
      data: parseResult.data,
      include: {
        _count: {
          select: {
            reviews: true,
            standardsDocs: true,
          },
        },
      },
    });

    log.info({ repoId: id, updates: parseResult.data }, 'Updated repo settings');
    res.json(updated);
  } catch (error) {
    log.error({ error, id: req.params.id }, 'Failed to update repository settings');
    res.status(500).json({ error: 'Failed to update repository settings' });
  }
});
