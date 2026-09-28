import type { Octokit } from '@octokit/rest';
import parseDiff from 'parse-diff';
import { createLogger } from '../utils/logger.js';

const log = createLogger('github-diff');

export interface FileDiff {
  filename: string;
  status: 'added' | 'modified' | 'removed' | 'renamed';
  patch: string;
  additions: DiffLine[];
  deletions: DiffLine[];
  hunks: DiffHunk[];
}

export interface DiffLine {
  lineNumber: number;
  content: string;
}

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  content: string;
}

/**
 * Fetch and parse the diff for a pull request.
 */
export async function fetchPRDiff(
  octokit: Octokit,
  owner: string,
  repo: string,
  pullNumber: number,
  ignoredPatterns: string[] = []
): Promise<FileDiff[]> {
  log.info({ owner, repo, pullNumber }, 'Fetching PR diff');

  // Fetch diff content using the diff media type
  const { data: diffText } = await (octokit as any).rest.pulls.get({
    owner,
    repo,
    pull_number: pullNumber,
    mediaType: { format: 'diff' },
  });

  // Parse the unified diff
  const files = parseDiff(diffText as unknown as string);

  const fileDiffs: FileDiff[] = [];

  for (const file of files) {
    const filename = file.to || file.from || '';

    // Skip deleted files (nothing to review)
    if (file.to === '/dev/null') continue;

    // Skip binary files
    if (file.chunks.length === 0 && !file.from && !file.to) continue;

    // Skip files matching ignored patterns
    if (shouldIgnoreFile(filename, ignoredPatterns)) {
      log.debug({ filename }, 'Skipping ignored file');
      continue;
    }

    const additions: DiffLine[] = [];
    const deletions: DiffLine[] = [];
    const hunks: DiffHunk[] = [];

    for (const chunk of file.chunks) {
      const hunkLines: string[] = [];

      for (const change of chunk.changes) {
        if (change.type === 'add') {
          additions.push({ lineNumber: change.ln, content: change.content });
          hunkLines.push(`+${change.content}`);
        } else if (change.type === 'del') {
          deletions.push({ lineNumber: change.ln, content: change.content });
          hunkLines.push(`-${change.content}`);
        } else {
          hunkLines.push(` ${change.content}`);
        }
      }

      hunks.push({
        oldStart: chunk.oldStart,
        oldLines: chunk.oldLines,
        newStart: chunk.newStart,
        newLines: chunk.newLines,
        content: hunkLines.join('\n'),
      });
    }

    // Determine file status
    let status: FileDiff['status'] = 'modified';
    if (file.from === '/dev/null') status = 'added';
    else if (file.to === '/dev/null') status = 'removed';
    else if (file.from !== file.to) status = 'renamed';

    fileDiffs.push({
      filename,
      status,
      patch: hunks.map((h) => h.content).join('\n'),
      additions,
      deletions,
      hunks,
    });
  }

  log.info({ fileCount: fileDiffs.length }, 'PR diff parsed');
  return fileDiffs;
}

/**
 * Fetch the full content of a file from a specific commit.
 */
export async function fetchFileContent(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string,
  ref: string
): Promise<string | null> {
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
      ref,
    });

    if ('content' in data && data.encoding === 'base64') {
      return Buffer.from(data.content, 'base64').toString('utf-8');
    }

    return null;
  } catch {
    log.warn({ path, ref }, 'Could not fetch file content');
    return null;
  }
}

/**
 * Check if a filename matches any of the ignored patterns.
 */
function shouldIgnoreFile(filename: string, patterns: string[]): boolean {
  for (const pattern of patterns) {
    const trimmed = pattern.trim();
    if (!trimmed) continue;

    // Simple glob matching: support * and **
    const regex = globToRegex(trimmed);
    if (regex.test(filename)) return true;
  }
  return false;
}

function globToRegex(glob: string): RegExp {
  const escaped = glob
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '{{GLOBSTAR}}')
    .replace(/\*/g, '[^/]*')
    .replace(/{{GLOBSTAR}}/g, '.*');
  return new RegExp(`^${escaped}$`);
}
