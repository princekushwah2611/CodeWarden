/**
 * Core types shared across all CodeWarden agents.
 */

export interface Finding {
  type: 'security' | 'standards';
  severity: 'critical' | 'high' | 'medium' | 'low';
  file: string;
  lineStart?: number;
  lineEnd?: number;
  explanation: string;
  suggestion: string;
  ruleId?: string;
  falsePositive?: boolean;
}

export interface ReviewResult {
  findings: Finding[];
  action: 'comment' | 'approve' | 'request-changes';
  summary: string;
}

export interface ScanContext {
  owner: string;
  repo: string;
  prNumber: number;
  commitSha: string;
  repoId: string;
  installationId: number;
}

/**
 * Semgrep output types for parsing scan results.
 */
export interface SemgrepLocation {
  line: number;
  col: number;
  offset: number;
}

export interface SemgrepFinding {
  check_id: string;
  path: string;
  start: SemgrepLocation;
  end: SemgrepLocation;
  extra: {
    message: string;
    severity: 'INFO' | 'WARNING' | 'ERROR';
    lines: string;
    metadata: {
      cwe?: string | string[];
      owasp?: string | string[];
      confidence?: 'LOW' | 'MEDIUM' | 'HIGH';
      impact?: 'LOW' | 'MEDIUM' | 'HIGH';
      category?: string;
      technology?: string[];
      references?: string[];
      [key: string]: unknown;
    };
    fingerprint: string;
    fix?: string;
  };
}

export interface SemgrepOutput {
  version: string;
  results: SemgrepFinding[];
  errors: Array<{
    code: number;
    level: string;
    type: string;
    message: string;
    path?: string;
  }>;
  paths: {
    scanned: string[];
    skipped?: Array<{ path: string; reason: string }>;
  };
}

/**
 * LLM security analysis output (expected JSON structure from Claude).
 */
export interface SecurityAnalysisResult {
  findings: Array<{
    severity: 'critical' | 'high' | 'medium' | 'low';
    file: string;
    lineStart: number;
    lineEnd?: number;
    explanation: string;
    suggestion: string;
    category: string;
  }>;
}

/**
 * LLM standards analysis output (expected JSON structure from Claude).
 */
export interface StandardsAnalysisResult {
  findings: Array<{
    file: string;
    lineStart: number;
    lineEnd?: number;
    explanation: string;
    suggestion: string;
    standardReference: string;
  }>;
}
