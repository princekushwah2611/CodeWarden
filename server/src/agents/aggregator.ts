import type { Finding, ReviewResult } from './types.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('aggregator');

const SEVERITY_RANKS: Record<Finding['severity'], number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

interface AggregatorOptions {
  severityThreshold?: string; // 'critical' | 'high' | 'medium' | 'low'
  autoApprove?: boolean;
}

/**
 * Merge findings from security and standards agents,
 * deduplicate them, rank them by severity, and determine the PR review action.
 */
export function aggregateFindings(
  securityFindings: Finding[],
  standardsFindings: Finding[],
  options: AggregatorOptions = {}
): ReviewResult {
  const { severityThreshold = 'medium', autoApprove = false } = options;
  log.info(
    {
      securityCount: securityFindings.length,
      standardsCount: standardsFindings.length,
      severityThreshold,
      autoApprove,
    },
    'Aggregating review findings'
  );

  const rawFindings = [...securityFindings, ...standardsFindings];

  // 1. Deduplicate findings
  const deduplicated: Finding[] = [];

  for (const finding of rawFindings) {
    const isDuplicate = deduplicated.some((existing) => {
      // Must be same file
      if (existing.file !== finding.file) return false;

      // Check for line overlap
      const lineOverlap =
        existing.lineStart &&
        finding.lineStart &&
        Math.abs(existing.lineStart - finding.lineStart) <= 2;

      // If same rule or same type & close lines
      if (existing.ruleId && finding.ruleId && existing.ruleId === finding.ruleId) {
        return lineOverlap;
      }

      // If both are security with overlapping lines, keep the higher severity
      if (existing.type === finding.type && lineOverlap) {
        return true;
      }

      return false;
    });

    if (!isDuplicate) {
      deduplicated.push(finding);
    } else {
      // If current has higher severity than existing duplicate, replace it
      const existingIdx = deduplicated.findIndex(
        (e) =>
          e.file === finding.file &&
          e.lineStart &&
          finding.lineStart &&
          Math.abs(e.lineStart - finding.lineStart) <= 2
      );
      if (existingIdx !== -1) {
        const existingRank = SEVERITY_RANKS[deduplicated[existingIdx].severity] || 0;
        const currentRank = SEVERITY_RANKS[finding.severity] || 0;
        if (currentRank > existingRank) {
          deduplicated[existingIdx] = finding;
        }
      }
    }
  }

  // 2. Sort by severity descending (critical -> high -> medium -> low)
  deduplicated.sort((a, b) => {
    const rankA = SEVERITY_RANKS[a.severity] || 0;
    const rankB = SEVERITY_RANKS[b.severity] || 0;
    return rankB - rankA;
  });

  // 3. Determine review action based on findings and repository settings
  const thresholdRank =
    SEVERITY_RANKS[severityThreshold.toLowerCase() as Finding['severity']] || 2;

  let action: ReviewResult['action'] = 'comment';

  const hasHighOrCritical = deduplicated.some(
    (f) => SEVERITY_RANKS[f.severity] >= 3 && SEVERITY_RANKS[f.severity] >= thresholdRank
  );

  const hasAnyBreachingThreshold = deduplicated.some(
    (f) => SEVERITY_RANKS[f.severity] >= thresholdRank
  );

  if (hasHighOrCritical) {
    action = 'request-changes';
  } else if (deduplicated.length === 0) {
    action = autoApprove ? 'approve' : 'comment';
  } else if (hasAnyBreachingThreshold) {
    action = 'comment';
  } else if (autoApprove) {
    action = 'approve';
  } else {
    action = 'comment';
  }

  // 4. Formulate summary text
  const summary = generateSummaryText(deduplicated);

  log.info(
    { totalDeduped: deduplicated.length, action },
    'Aggregation completed successfully'
  );

  return {
    findings: deduplicated,
    action,
    summary,
  };
}

function generateSummaryText(findings: Finding[]): string {
  if (findings.length === 0) {
    return 'CodeWarden analyzed this pull request and found zero security vulnerabilities or coding standard drift.';
  }

  const criticals = findings.filter((f) => f.severity === 'critical').length;
  const highs = findings.filter((f) => f.severity === 'high').length;
  const mediums = findings.filter((f) => f.severity === 'medium').length;
  const lows = findings.filter((f) => f.severity === 'low').length;

  const parts: string[] = [];
  if (criticals > 0) parts.push(`${criticals} Critical`);
  if (highs > 0) parts.push(`${highs} High`);
  if (mediums > 0) parts.push(`${mediums} Medium`);
  if (lows > 0) parts.push(`${lows} Low`);

  const secCount = findings.filter((f) => f.type === 'security').length;
  const stdCount = findings.filter((f) => f.type === 'standards').length;

  return `CodeWarden identified ${findings.length} issue(s) (${parts.join(', ')}). Breakdown: ${secCount} security vulnerability/risk item(s) and ${stdCount} standards drift item(s). Please review the suggested changes.`;
}
