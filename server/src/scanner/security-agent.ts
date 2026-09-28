import type { FileDiff } from '../github/diff.js';
import type { Finding, SecurityAnalysisResult, SemgrepFinding } from '../agents/types.js';
import { callLLMJson } from '../utils/llm.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('security-agent');

const SECURITY_SYSTEM_PROMPT = `You are a senior security engineer reviewing code changes in a pull request.
Your job is to identify security vulnerabilities and explain them clearly.

## OWASP Top 10 Reference (2021)
1. A01:2021 – Broken Access Control
2. A02:2021 – Cryptographic Failures
3. A03:2021 – Injection (SQL, NoSQL, OS, LDAP, XSS)
4. A04:2021 – Insecure Design
5. A05:2021 – Security Misconfiguration
6. A06:2021 – Vulnerable and Outdated Components
7. A07:2021 – Identification and Authentication Failures
8. A08:2021 – Software and Data Integrity Failures
9. A09:2021 – Security Logging and Monitoring Failures
10. A10:2021 – Server-Side Request Forgery (SSRF)

## Rules
- Only flag REAL security issues. Do NOT flag style, formatting, or non-security concerns.
- For each finding, explain WHY it's dangerous and HOW to fix it.
- Assign severity based on exploitability and impact:
  - critical: remotely exploitable, data breach or RCE potential
  - high: significant security risk, requires specific conditions
  - medium: defense-in-depth issue, moderate risk
  - low: minor security concern, informational
- If a line has \`// codewarden-ignore\` or \`# codewarden-ignore\`, skip it.
- Focus on the CHANGED lines (additions), not the surrounding context.

## Output Format
Respond with ONLY valid JSON (no markdown wrapping):
{
  "findings": [
    {
      "severity": "critical|high|medium|low",
      "file": "path/to/file.ts",
      "lineStart": 42,
      "lineEnd": 42,
      "explanation": "Clear explanation of the vulnerability and its impact",
      "suggestion": "Concrete code suggestion to fix the issue",
      "category": "OWASP category (e.g., A03:2021 – Injection)"
    }
  ]
}

If there are no security issues, return: { "findings": [] }`;

/**
 * Run LLM security analysis on PR diffs.
 * Combines Semgrep static analysis results with LLM reasoning for deeper analysis.
 */
export async function analyzeSecurityWithLLM(
  fileDiffs: FileDiff[],
  semgrepFindings: SemgrepFinding[]
): Promise<Finding[]> {
  log.info({ fileCount: fileDiffs.length }, 'Starting LLM security analysis');

  const findings: Finding[] = [];

  // Process files in batches to manage token usage
  const batchSize = 5;
  for (let i = 0; i < fileDiffs.length; i += batchSize) {
    const batch = fileDiffs.slice(i, i + batchSize);
    const batchFindings = await analyzeBatch(batch, semgrepFindings);
    findings.push(...batchFindings);
  }

  log.info({ findingCount: findings.length }, 'LLM security analysis complete');
  return findings;
}

async function analyzeBatch(
  fileDiffs: FileDiff[],
  semgrepFindings: SemgrepFinding[]
): Promise<Finding[]> {
  // Build the user message with diff content and Semgrep evidence
  let userMessage = '## Code Changes to Review\n\n';

  for (const diff of fileDiffs) {
    userMessage += `### File: ${diff.filename}\n`;
    userMessage += '```diff\n' + diff.patch + '\n```\n\n';

    // Include any Semgrep findings for this file as evidence
    const fileFindings = semgrepFindings.filter((f) => f.path === diff.filename);
    if (fileFindings.length > 0) {
      userMessage += '#### Static Analysis Evidence (Semgrep)\n';
      for (const sf of fileFindings) {
        userMessage += `- **${sf.check_id}** (line ${sf.start.line}): ${sf.extra.message}\n`;
      }
      userMessage += '\n';
    }
  }

  userMessage += '\nAnalyze the above code changes for security vulnerabilities. Consider both the Semgrep evidence and any additional issues you can identify.';

  try {
    const result = await callLLMJson<SecurityAnalysisResult>({
      systemPrompt: SECURITY_SYSTEM_PROMPT,
      userMessage,
      maxTokens: 4096,
      temperature: 0.1, // Low temperature for consistent, focused analysis
    });

    return (result.findings || []).map((f) => ({
      type: 'security' as const,
      severity: f.severity,
      file: f.file,
      lineStart: f.lineStart,
      lineEnd: f.lineEnd,
      explanation: f.explanation,
      suggestion: f.suggestion,
      ruleId: f.category,
    }));
  } catch (error) {
    log.error({ error }, 'LLM security analysis failed for batch');
    return [];
  }
}

/**
 * Check if a line has a codewarden-ignore suppression comment.
 */
export function hasIgnoreComment(line: string): boolean {
  return /\/\/\s*codewarden-ignore|#\s*codewarden-ignore/.test(line);
}
