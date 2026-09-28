export interface Repository {
  id: string;
  githubRepoId: number;
  name: string;
  owner: string;
  severityThreshold: string;
  autoApprove: boolean;
  ignoredPatterns: string;
  createdAt: string;
  _count?: { reviews: number; standardsDocs: number };
}

export interface StandardsDocument {
  id: string;
  repoId: string;
  sourceFile: string;
  chunkCount: number;
  uploadedAt: string;
}

export interface Review {
  id: string;
  prNumber: number;
  repoId: string;
  status: string;
  actionTaken: string | null;
  summary: string | null;
  createdAt: string;
  completedAt: string | null;
  durationMs: number | null;
  repo?: Repository;
  findings?: Finding[];
  _count?: { findings: number };
}

export interface Finding {
  id: string;
  reviewId: string;
  type: 'security' | 'standards';
  severity: 'critical' | 'high' | 'medium' | 'low' | null;
  file: string;
  lineStart: number | null;
  lineEnd: number | null;
  explanation: string;
  suggestion: string;
  ruleId: string | null;
  falsePositive: boolean;
}

export interface OverviewStats {
  totalReviews: number;
  criticalIssues: number;
  avgTimeMs: number;
  healthScore: number;
}

export interface TrendPoint {
  date: string;
  security: number;
  standards: number;
}

export type Severity = 'critical' | 'high' | 'medium' | 'low';
