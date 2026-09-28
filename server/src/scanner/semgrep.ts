import { execFile } from 'child_process';
import { promisify } from 'util';
import { writeFile, mkdir, unlink, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import type { FileDiff } from '../github/diff.js';
import type { SemgrepOutput, SemgrepFinding, Finding } from '../agents/types.js';
import { createLogger } from '../utils/logger.js';

const execFileAsync = promisify(execFile);
const log = createLogger('semgrep');

/** Supported file extensions for scanning. */
const SUPPORTED_EXTENSIONS = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.py', '.json', '.yaml', '.yml',
]);

/** Semgrep rulesets to use for scanning. */
const RULESETS = [
  'p/owasp-top-ten',
  'p/javascript',
  'p/typescript',
  'p/python',
  'p/secrets',
];

/**
 * Run Semgrep on the files from a PR diff.
 *
 * Since we don't have a local clone, we write the file contents to a temp
 * directory and scan that. In a production deployment with access to the repo,
 * you'd use --baseline-commit instead.
 */
export async function runSemgrepScan(
  fileDiffs: FileDiff[],
  fileContents: Map<string, string>
): Promise<SemgrepFinding[]> {
  // Filter to supported files
  const scannable = fileDiffs.filter((f) => {
    const ext = '.' + f.filename.split('.').pop();
    return SUPPORTED_EXTENSIONS.has(ext) && f.status !== 'removed';
  });

  if (scannable.length === 0) {
    log.info('No scannable files in diff');
    return [];
  }

  // Create temp directory for the scan
  const scanDir = join(tmpdir(), `codewarden-scan-${Date.now()}`);
  await mkdir(scanDir, { recursive: true });

  const outputFile = join(scanDir, 'semgrep-output.json');

  try {
    // Write file contents to temp directory
    for (const file of scannable) {
      const content = fileContents.get(file.filename);
      if (!content) continue;

      const filePath = join(scanDir, file.filename);
      const dirPath = filePath.substring(0, filePath.lastIndexOf('/'));
      await mkdir(dirPath, { recursive: true });
      await writeFile(filePath, content, 'utf-8');
    }

    // Build semgrep command args
    const args = ['scan', '--json', `--json-output=${outputFile}`];

    for (const ruleset of RULESETS) {
      args.push('--config', ruleset);
    }

    // Performance guards
    args.push('--timeout', '30');
    args.push('--max-memory', '2048');
    args.push('--exclude', 'node_modules');
    args.push('--exclude', 'dist');

    // Target the scan directory
    args.push(scanDir);

    log.info({ fileCount: scannable.length, rulesets: RULESETS }, 'Running Semgrep scan');

    try {
      await execFileAsync('semgrep', args, {
        maxBuffer: 50 * 1024 * 1024, // 50MB buffer
        timeout: 120_000, // 2 minute timeout
      });
    } catch (execError: any) {
      // Semgrep may exit with code 1 when findings exist but output is still valid
      if (execError.code !== 1) {
        log.warn({ stderr: execError.stderr }, 'Semgrep exited with warnings');
      }
    }

    // Read and parse the output
    const { readFile } = await import('fs/promises');
    let outputContent: string;
    try {
      outputContent = await readFile(outputFile, 'utf-8');
    } catch {
      log.warn('Semgrep output file not found — no results');
      return [];
    }

    const output: SemgrepOutput = JSON.parse(outputContent);

    // Log any errors
    if (output.errors && output.errors.length > 0) {
      log.warn({ errors: output.errors }, 'Semgrep reported errors');
    }

    // Map paths back to original filenames (remove temp dir prefix)
    const results = output.results.map((r) => ({
      ...r,
      path: r.path.replace(scanDir + '/', ''),
    }));

    // Filter to only findings on lines that were actually changed in the PR
    const filteredResults = filterToChangedLines(results, fileDiffs);

    log.info(
      { totalFindings: results.length, filteredFindings: filteredResults.length },
      'Semgrep scan complete'
    );

    return filteredResults;
  } finally {
    // Clean up temp directory
    await rm(scanDir, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * Filter Semgrep findings to only those on lines that were changed in the PR.
 */
function filterToChangedLines(
  findings: SemgrepFinding[],
  fileDiffs: FileDiff[]
): SemgrepFinding[] {
  const addedLines = new Map<string, Set<number>>();

  for (const diff of fileDiffs) {
    const lines = new Set<number>();
    for (const addition of diff.additions) {
      lines.add(addition.lineNumber);
    }
    addedLines.set(diff.filename, lines);
  }

  return findings.filter((finding) => {
    const fileLines = addedLines.get(finding.path);
    if (!fileLines) return false;

    for (let line = finding.start.line; line <= finding.end.line; line++) {
      if (fileLines.has(line)) return true;
    }
    return false;
  });
}

/**
 * Convert Semgrep findings to CodeWarden Finding format.
 */
export function semgrepToFindings(semgrepFindings: SemgrepFinding[]): Finding[] {
  return semgrepFindings.map((sf) => {
    // Map Semgrep severity to CodeWarden severity
    const severityMap: Record<string, Finding['severity']> = {
      ERROR: 'high',
      WARNING: 'medium',
      INFO: 'low',
    };

    // Boost to critical if confidence and impact are both HIGH
    let severity = severityMap[sf.extra.severity] || 'medium';
    if (
      sf.extra.metadata.confidence === 'HIGH' &&
      sf.extra.metadata.impact === 'HIGH'
    ) {
      severity = 'critical';
    }

    return {
      type: 'security' as const,
      severity,
      file: sf.path,
      lineStart: sf.start.line,
      lineEnd: sf.end.line,
      explanation: sf.extra.message,
      suggestion: sf.extra.fix || 'Review and fix this security issue.',
      ruleId: sf.check_id,
    };
  });
}
