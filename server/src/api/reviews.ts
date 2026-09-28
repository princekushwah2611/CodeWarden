import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('api-reviews');
export const reviewsRouter = Router();

// GET /api/repos/:repoId/reviews - Reviews for a repo
reviewsRouter.get('/repos/:repoId/reviews', async (req: Request, res: Response) => {
  try {
    const repoId = String(req.params.repoId);
    const reviews = await prisma.review.findMany({
      where: { repoId },
      orderBy: { createdAt: 'desc' },
      include: {
        repo: true,
        findings: true,
        _count: {
          select: { findings: true },
        },
      },
    });

    res.json(reviews);
  } catch (error) {
    log.error({ error, repoId: req.params.repoId }, 'Failed to fetch repo reviews');
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// GET /api/reviews/:id - Get specific review with findings
reviewsRouter.get('/reviews/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const review = await prisma.review.findUnique({
      where: { id },
      include: {
        repo: true,
        findings: {
          orderBy: [
            { severity: 'asc' }, // Will sort in memory or format
            { file: 'asc' },
          ],
        },
      },
    });

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    res.json(review);
  } catch (error) {
    log.error({ error, id: req.params.id }, 'Failed to fetch review');
    res.status(500).json({ error: 'Failed to fetch review' });
  }
});

// Toggle false positive on a finding
const handleFalsePositive = async (req: Request, res: Response) => {
  try {
    const findingId = String(req.params.findingId);
    const finding = await prisma.finding.findUnique({
      where: { id: findingId },
    });

    if (!finding) {
      return res.status(404).json({ error: 'Finding not found' });
    }

    const updated = await prisma.finding.update({
      where: { id: findingId },
      data: { falsePositive: !finding.falsePositive },
    });

    log.info({ findingId, falsePositive: updated.falsePositive }, 'Updated false positive status');
    res.json(updated);
  } catch (error) {
    log.error({ error, findingId: req.params.findingId }, 'Failed to update finding false positive');
    res.status(500).json({ error: 'Failed to update finding' });
  }
};

reviewsRouter.post('/findings/:findingId/false-positive', handleFalsePositive);
reviewsRouter.patch('/findings/:findingId/false-positive', handleFalsePositive);

// GET /api/stats/overview - Global dashboard summary stats
reviewsRouter.get('/stats/overview', async (_req: Request, res: Response) => {
  try {
    const totalReviews = await prisma.review.count();

    const criticalIssues = await prisma.finding.count({
      where: {
        severity: 'critical',
        falsePositive: false,
      },
    });

    // Average response duration
    const avgDurationResult = await prisma.review.aggregate({
      where: { durationMs: { not: null } },
      _avg: { durationMs: true },
    });
    const avgTimeMs = Math.round(avgDurationResult._avg.durationMs || 45000);

    // Calculate a team health score (0 - 100)
    // Starts at 100, reduced by unresolved criticals & highs per review
    const highIssues = await prisma.finding.count({
      where: {
        severity: 'high',
        falsePositive: false,
      },
    });

    let healthScore = 95;
    if (totalReviews > 0) {
      const penalty = (criticalIssues * 15 + highIssues * 5) / totalReviews;
      healthScore = Math.max(20, Math.min(100, Math.round(100 - penalty)));
    }

    res.json({
      totalReviews,
      criticalIssues,
      avgTimeMs,
      healthScore,
    });
  } catch (error) {
    log.error({ error }, 'Failed to calculate overview stats');
    res.status(500).json({ error: 'Failed to calculate overview stats' });
  }
});

// GET /api/stats/trends - Time series data of issues
reviewsRouter.get('/stats/trends', async (req: Request, res: Response) => {
  try {
    const days = Math.min(90, Math.max(7, Number(req.query.days) || 30));
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    const findings = await prisma.finding.findMany({
      where: {
        review: {
          createdAt: { gte: sinceDate },
        },
        falsePositive: false,
      },
      include: {
        review: {
          select: { createdAt: true },
        },
      },
    });

    // Bucket by day (YYYY-MM-DD)
    const pointsMap = new Map<string, { security: number; standards: number }>();

    // Pre-populate past N days
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      pointsMap.set(key, { security: 0, standards: 0 });
    }

    for (const finding of findings) {
      const dayKey = finding.review.createdAt.toISOString().split('T')[0];
      if (!pointsMap.has(dayKey)) {
        pointsMap.set(dayKey, { security: 0, standards: 0 });
      }
      const entry = pointsMap.get(dayKey)!;
      if (finding.type === 'security') {
        entry.security += 1;
      } else {
        entry.standards += 1;
      }
    }

    const trends = Array.from(pointsMap.entries()).map(([date, counts]) => ({
      date,
      security: counts.security,
      standards: counts.standards,
    }));

    res.json(trends);
  } catch (error) {
    log.error({ error }, 'Failed to fetch stats trends');
    res.status(500).json({ error: 'Failed to fetch stats trends' });
  }
});
