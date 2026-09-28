import type { FileDiff } from '../github/diff.js';
import type { Finding, StandardsAnalysisResult } from '../agents/types.js';
import { retrieveRelevantStandards } from './retrieve.js';
import { callLLMJson } from '../utils/llm.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('standards-agent');

const STANDARDS_SYSTEM_PROMPT = `You are a senior developer reviewing code changes against team coding standards.
You have been given specific coding standard documentation from the team and a code diff.
Your job is to identify violations of the team's OWN standards, not generic best practices.

## Rules
- ONLY flag violations of the specific standards provided below. Do NOT invent rules.
- If no standards are relevant to the code change, return an empty findings array.
- For each finding, cite the specific standard being violated.
- Provide concrete, actionable suggestions — show what the code should look like.
- Severity mapping for standards:
  - medium: clear violation of a documented standard
  - low: minor style/convention drift from the documented standard
- Do NOT flag security issues (those are handled by a separate agent).
- If a line has \`// codewarden-ignore\` or \`# codewarden-ignore\`, skip it.

## Output Format
Respond with ONLY valid JSON (no markdown wrapping):
{
  "findings": [
    {
      "file": "path/to/file.ts",
      "lineStart": 42,
      "lineEnd": 45,
      "explanation": "This violates the team's naming convention: [cite standard]",
      "suggestion": "Rename to 'getUserById' per the team's camelCase function naming standard",
      "standardReference": "Brief quote or reference from the standards doc"
    }
  ]
}

If there are no standards violations, return: { "findings": [] }`;

/**
 * Analyze PR diffs against team coding standards using RAG + LLM.
 */
export async function analyzeStandards(
  repoId: string,
  fileDiffs: FileDiff[]
): Promise<Finding[]> {
  log.info({ repoId, fileCount: fileDiffs.length }, 'Starting standards analysis');

  const allFindings: Finding[] = [];

  for (const diff of fileDiffs) {
    if (diff.additions.length === 0) continue;

    // Build a query from the diff content for RAG retrieval
    const query = `File: ${diff.filename}\n\nCode changes:\n${diff.patch}`;

    // Retrieve relevant standards chunks
    const chunks = await retrieveRelevantStandards(repoId, query);

    if (chunks.length === 0) {
      log.debug({ file: diff.filename }, 'No relevant standards found for file');
      continue;
    }

    // Build the LLM prompt with retrieved standards and the diff
    let userMessage = '## Team Coding Standards (Retrieved)\n\n';
    for (const chunk of chunks) {
      userMessage += `### From: ${chunk.filename}${chunk.section ? ` — ${chunk.section}` : ''}\n`;
      userMessage += chunk.text + '\n\n';
    }

    userMessage += '## Code Changes to Review\n\n';
    userMessage += `### File: ${diff.filename}\n`;
    userMessage += '```diff\n' + diff.patch + '\n```\n\n';
    userMessage += 'Review the code changes against the team coding standards above. Only flag genuine violations.';

    try {
      const result = await callLLMJson<StandardsAnalysisResult>({
        systemPrompt: STANDARDS_SYSTEM_PROMPT,
        userMessage,
        maxTokens: 2048,
        temperature: 0.1,
      });

      const findings: Finding[] = (result.findings || []).map((f) => ({
        type: 'standards' as const,
        severity: 'medium' as const,
        file: f.file || diff.filename,
        lineStart: f.lineStart,
        lineEnd: f.lineEnd,
        explanation: f.explanation,
        suggestion: f.suggestion,
      }));

      allFindings.push(...findings);
    } catch (error) {
      log.error({ error, file: diff.filename }, 'Standards analysis failed for file');
    }
  }

  log.info({ findingCount: allFindings.length }, 'Standards analysis complete');
  return allFindings;
}
