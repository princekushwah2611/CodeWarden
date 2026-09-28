import { prisma } from '../db.js';
import { getGitHubApp } from './app.js';
import { fetchPRDiff, fetchFileContent, type FileDiff } from './diff.js';
import { postPRReview } from './comments.js';
import { runSemgrepScan, semgrepToFindings } from '../scanner/semgrep.js';
import { analyzeSecurityWithLLM } from '../scanner/security-agent.js';
import { analyzeStandards } from '../rag/standards-agent.js';
import { aggregateFindings } from '../agents/aggregator.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('github-webhooks');

/**
 * Register webhook handlers for GitHub App events.
 */
export function registerWebhookHandlers(): void {
  const app = getGitHubApp();

  app.webhooks.on(
    ['pull_request.opened', 'pull_request.synchronize'],
    async ({ payload }) => {
      const repo = payload.repository;
      const pr = payload.pull_request;
      const installationId = payload.installation?.id;

      if (!installationId) {
        log.warn({ pr: pr.number, repo: repo.full_name }, 'Missing installation ID on webhook');
        return;
      }

      log.info(
        {
          action: payload.action,
          repo: repo.full_name,
          pr: pr.number,
          headSha: pr.head.sha,
        },
        'Received pull_request event, initiating review pipeline'
      );

      // Run pipeline asynchronously to prevent webhook timeout
      runReviewPipeline({
        installationId,
        githubRepoId: repo.id,
        owner: repo.owner.login,
        repoName: repo.name,
        prNumber: pr.number,
        commitSha: pr.head.sha,
      }).catch((err) => {
        log.error({ err, pr: pr.number, repo: repo.full_name }, 'Unhandled error in review pipeline');
      });
    }
  );

  /**
   * When the GitHub App is installed on an org/repo, automatically
   * register all selected repositories in the CodeWarden database.
   */
  app.webhooks.on('installation.created', async ({ payload }) => {
    const installationId = payload.installation.id;
    const repos = payload.repositories ?? [];

    log.info(
      { installationId, repos: repos.map((r: { full_name: string }) => r.full_name) },
      `GitHub App installed — registering ${repos.length} repo(s)`
    );

    for (const repo of repos as Array<{ id: number; name: string; full_name: string }>) {
      const [owner, name] = repo.full_name.split('/');
      try {
        await prisma.repository.upsert({
          where: { githubRepoId: repo.id },
          update: { installationId, name, owner },
          create: {
            githubRepoId: repo.id,
            name,
            owner: owner ?? '',
            installationId,
            severityThreshold: 'medium',
            autoApprove: false,
            ignoredPatterns: '',
          },
        });
        log.info({ repo: repo.full_name }, 'Repository registered');
      } catch (err) {
        log.error({ err, repo: repo.full_name }, 'Failed to register repository on installation');
      }
    }
  });

  /**
   * When repos are added to an existing installation.
   */
  app.webhooks.on('installation_repositories.added', async ({ payload }) => {
    const installationId = payload.installation.id;
    const repos = payload.repositories_added ?? [];

    log.info({ installationId, count: repos.length }, 'Repos added to installation');

    for (const repo of repos as Array<{ id: number; name: string; full_name: string }>) {
      const [owner, name] = repo.full_name.split('/');
      try {
        await prisma.repository.upsert({
          where: { githubRepoId: repo.id },
          update: { installationId, name, owner: owner ?? '' },
          create: {
            githubRepoId: repo.id,
            name,
            owner: owner ?? '',
            installationId,
            severityThreshold: 'medium',
            autoApprove: false,
            ignoredPatterns: '',
          },
        });
        log.info({ repo: repo.full_name }, 'Repository registered (installation_repositories.added)');
      } catch (err) {
        log.error({ err, repo: repo.full_name }, 'Failed to register repository');
      }
    }
  });

  app.webhooks.onError((error) => {
    log.error({ error }, 'GitHub webhook signature or processing error');
  });

  log.info('GitHub webhook handlers registered');
}

interface ReviewPipelineParams {
  installationId: number;
  githubRepoId: number;
  owner: string;
  repoName: string;
  prNumber: number;
  commitSha: string;
}

/**
 * Full end-to-end review pipeline for a pull request.
 */
export async function runReviewPipeline(params: ReviewPipelineParams): Promise<void> {
  const startTime = Date.now();
  const { installationId, githubRepoId, owner, repoName, prNumber, commitSha } = params;

  // 1. Get or create repository record
  const repository = await prisma.repository.upsert({
    where: { githubRepoId },
    update: {
      owner,
      name: repoName,
      installationId,
    },
    create: {
      githubRepoId,
      name: repoName,
      owner,
      installationId,
      severityThreshold: 'medium',
      autoApprove: false,
      ignoredPatterns: '*.md,*.lock,*.min.js',
    },
  });

  // 2. Create pending Review in database
  const reviewRecord = await prisma.review.create({
    data: {
      repoId: repository.id,
      prNumber,
      status: 'pending',
    },
  });

  try {
    const app = getGitHubApp();
    const octokit = await app.getInstallationOctokit(installationId);

    // 3. Fetch and parse diff
    const ignoredList = repository.ignoredPatterns
      ? repository.ignoredPatterns.split(',').map((p) => p.trim())
      : [];
    const fileDiffs: FileDiff[] = await fetchPRDiff(
      octokit as any,
      owner,
      repoName,
      prNumber,
      ignoredList
    );

    if (fileDiffs.length === 0) {
      log.info({ repoId: repository.id, prNumber }, 'No reviewable files found in PR diff');
      await prisma.review.update({
        where: { id: reviewRecord.id },
        data: {
          status: 'completed',
          actionTaken: 'comment',
          summary: 'No changes to review or all changed files matched ignored patterns.',
          completedAt: new Date(),
          durationMs: Date.now() - startTime,
        },
      });
      return;
    }

    // 4. Fetch full content of changed files for static analysis
    const fileContents = new Map<string, string>();
    for (const diff of fileDiffs) {
      if (diff.status !== 'removed') {
        const content = await fetchFileContent(
          octokit as any,
          owner,
          repoName,
          diff.filename,
          commitSha
        );
        if (content) {
          fileContents.set(diff.filename, content);
        }
      }
    }

    // 5. Run Security Scanner and Standards Agent in parallel
    const [securityResults, standardsFindings] = await Promise.all([
      (async () => {
        try {
          // Semgrep pass
          const semgrepRaw = await runSemgrepScan(fileDiffs, fileContents);
          const semgrepFindings = semgrepToFindings(semgrepRaw);

          // LLM security reasoning layer
          const llmSecurityFindings = await analyzeSecurityWithLLM(fileDiffs, semgrepRaw);

          return [...semgrepFindings, ...llmSecurityFindings];
        } catch (secError) {
          log.warn({ secError }, 'Security scanning encountered partial failure; proceeding with available data');
          return [];
        }
      })(),
      (async () => {
        try {
          return await analyzeStandards(repository.id, fileDiffs);
        } catch (stdError) {
          log.warn({ stdError }, 'Standards evaluation encountered error; proceeding');
          return [];
        }
      })(),
    ]);

    // 6. Aggregate findings, deduplicate, and decide review action
    const aggregatedReview = aggregateFindings(securityResults, standardsFindings, {
      severityThreshold: repository.severityThreshold,
      autoApprove: repository.autoApprove,
    });

    // 7. Post review to GitHub
    try {
      await postPRReview(
        octokit as any,
        owner,
        repoName,
        prNumber,
        commitSha,
        aggregatedReview
      );
    } catch (commentError) {
      log.error({ commentError }, 'Failed to post review comments to GitHub PR');
    }

    // 8. Save review findings and status to database
    const completedAt = new Date();
    const durationMs = Date.now() - startTime;

    await prisma.$transaction(async (tx) => {
      await tx.review.update({
        where: { id: reviewRecord.id },
        data: {
          status: 'completed',
          actionTaken: aggregatedReview.action,
          summary: aggregatedReview.summary,
          completedAt,
          durationMs,
        },
      });

      if (aggregatedReview.findings.length > 0) {
        await tx.finding.createMany({
          data: aggregatedReview.findings.map((f) => ({
            reviewId: reviewRecord.id,
            type: f.type,
            severity: f.severity,
            file: f.file,
            lineStart: f.lineStart ?? null,
            lineEnd: f.lineEnd ?? null,
            explanation: f.explanation,
            suggestion: f.suggestion,
            ruleId: f.ruleId ?? null,
            falsePositive: false,
          })),
        });
      }
    });

    log.info(
      {
        reviewId: reviewRecord.id,
        durationMs,
        findingsCount: aggregatedReview.findings.length,
        action: aggregatedReview.action,
      },
      'Review pipeline completed successfully'
    );
  } catch (err: any) {
    log.error({ err, reviewId: reviewRecord.id }, 'Review pipeline failed with error');
    await prisma.review.update({
      where: { id: reviewRecord.id },
      data: {
        status: 'error',
        summary: `Review failed: ${err?.message || 'Unknown error'}`,
        completedAt: new Date(),
        durationMs: Date.now() - startTime,
      },
    });
  }
}
