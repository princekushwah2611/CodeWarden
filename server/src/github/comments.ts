import type { Octokit } from '@octokit/rest';
import type { ReviewResult } from '../agents/types.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('github-comments');

/**
 * Post a review with inline comments to a pull request.
 */
export async function postPRReview(
  octokit: Octokit,
  owner: string,
  repo: string,
  pullNumber: number,
  commitSha: string,
  review: ReviewResult
): Promise<void> {
  log.info(
    { owner, repo, pullNumber, findingCount: review.findings.length, action: review.action },
    'Posting PR review'
  );

  // Map the action to a GitHub review event
  const eventMap: Record<string, 'COMMENT' | 'APPROVE' | 'REQUEST_CHANGES'> = {
    comment: 'COMMENT',
    approve: 'APPROVE',
    'request-changes': 'REQUEST_CHANGES',
  };

  const event = eventMap[review.action] || 'COMMENT';

  // Build inline comments for findings that have line numbers
  const comments: Array<{
    path: string;
    line: number;
    body: string;
  }> = [];

  for (const finding of review.findings) {
    if (finding.falsePositive) continue;

    const body = formatFindingComment(finding);

    if (finding.lineStart) {
      comments.push({
        path: finding.file,
        line: finding.lineStart,
        body,
      });
    }
  }

  // Build the review body (summary)
  const body = formatReviewSummary(review);

  try {
    if (comments.length > 0) {
      await (octokit as any).rest.pulls.createReview({
        owner,
        repo,
        pull_number: pullNumber,
        commit_id: commitSha,
        body,
        event,
        comments,
      });
    } else {
      // No inline comments — just post a summary comment
      await (octokit as any).rest.issues.createComment({
        owner,
        repo,
        issue_number: pullNumber,
        body,
      });
    }

    log.info({ commentCount: comments.length }, 'PR review posted successfully');
  } catch (error) {
    log.error({ error }, 'Failed to post PR review');
    throw error;
  }
}

interface FindingLike {
  type: string;
  severity?: string | null;
  file: string;
  lineStart?: number | null;
  lineEnd?: number | null;
  explanation: string;
  suggestion: string;
  ruleId?: string | null;
  falsePositive?: boolean;
}

/**
 * Format a single finding as a GitHub comment body.
 */
function formatFindingComment(finding: FindingLike): string {
  const severityEmoji: Record<string, string> = {
    critical: '🔴',
    high: '🟠',
    medium: '🔵',
    low: '⚪',
  };

  const emoji = finding.severity ? severityEmoji[finding.severity] || '⚪' : '⚪';
  const typeLabel = finding.type === 'security' ? '🔒 Security' : '📏 Standards';
  const severityLabel = finding.severity
    ? ` | ${emoji} ${finding.severity.toUpperCase()}`
    : '';

  let comment = `**${typeLabel}${severityLabel}**\n\n`;
  comment += `${finding.explanation}\n\n`;

  if (finding.suggestion) {
    comment += `**💡 Suggestion:**\n${finding.suggestion}\n\n`;
  }

  if (finding.ruleId) {
    comment += `<sub>Rule: \`${finding.ruleId}\` | Suppress: \`// codewarden-ignore\`</sub>`;
  } else {
    comment += `<sub>Suppress: \`// codewarden-ignore\`</sub>`;
  }

  return comment;
}

/**
 * Format the overall review summary.
 */
function formatReviewSummary(review: ReviewResult): string {
  const { findings, summary } = review;

  const securityCount = findings.filter((f) => f.type === 'security').length;
  const standardsCount = findings.filter((f) => f.type === 'standards').length;
  const criticalCount = findings.filter((f) => f.severity === 'critical').length;
  const highCount = findings.filter((f) => f.severity === 'high').length;

  let body = `## 🛡️ CodeWarden Review\n\n`;

  if (findings.length === 0) {
    body += `✅ **No issues found.** This PR looks good!\n`;
  } else {
    body += `Found **${findings.length}** issue(s):\n\n`;
    body += `| Category | Count |\n|---|---|\n`;
    if (securityCount > 0) body += `| 🔒 Security | ${securityCount} |\n`;
    if (standardsCount > 0) body += `| 📏 Standards | ${standardsCount} |\n`;
    if (criticalCount > 0) body += `| 🔴 Critical | ${criticalCount} |\n`;
    if (highCount > 0) body += `| 🟠 High | ${highCount} |\n`;
    body += `\n`;
  }

  if (summary) {
    body += `### Summary\n${summary}\n\n`;
  }

  body += `---\n<sub>🤖 Automated review by CodeWarden</sub>`;

  return body;
}
