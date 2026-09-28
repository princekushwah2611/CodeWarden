import { OverviewStats, TrendPoint, Repository, Review, StandardsDocument, Finding } from '../types';

async function fetcher<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    throw new Error(`API Error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export const fetchOverviewStats = () => fetcher<OverviewStats>('/api/stats/overview');
export const fetchTrends = (days: number = 30) => fetcher<TrendPoint[]>(`/api/stats/trends?days=${days}`);
export const fetchRepos = () => fetcher<Repository[]>('/api/repos');
export const fetchRepo = (id: string) => fetcher<Repository>(`/api/repos/${id}`);
export const fetchRepoReviews = (repoId: string) => fetcher<Review[]>(`/api/repos/${repoId}/reviews`);
export const fetchReview = (id: string) => fetcher<Review>(`/api/reviews/${id}`);
export const fetchStandardsDocs = (repoId: string) => fetcher<StandardsDocument[]>(`/api/repos/${repoId}/standards-docs`);

export const uploadStandardsDoc = async (repoId: string, file: File): Promise<StandardsDocument> => {
  const formData = new FormData();
  formData.append('file', file);
  return fetcher<StandardsDocument>(`/api/repos/${repoId}/standards-docs`, {
    method: 'POST',
    body: formData,
  });
};

export const deleteStandardsDoc = (repoId: string, docId: string) =>
  fetcher<void>(`/api/repos/${repoId}/standards-docs/${docId}`, { method: 'DELETE' });

export const reindexStandardsDoc = (repoId: string, docId: string) =>
  fetcher<void>(`/api/repos/${repoId}/standards-docs/${docId}/reindex`, { method: 'POST' });

export const updateRepoSettings = (repoId: string, settings: Partial<Repository>) =>
  fetcher<Repository>(`/api/repos/${repoId}/settings`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });

export const markFalsePositive = (findingId: string) =>
  fetcher<Finding>(`/api/findings/${findingId}/false-positive`, { method: 'POST' });
