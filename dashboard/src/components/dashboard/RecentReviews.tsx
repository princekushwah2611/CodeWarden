import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { SeverityBadge } from '../ui/SeverityBadge';
import { Review, Severity } from '../../types';

interface RecentReviewsProps {
  reviews: Review[];
}

export const RecentReviews: React.FC<RecentReviewsProps> = ({ reviews }) => {
  const navigate = useNavigate();

  const getHighestSeverity = (findings: any[] = []): Severity | null => {
    if (!findings.length) return null;
    const severities = findings.map(f => f.severity);
    if (severities.includes('critical')) return 'critical';
    if (severities.includes('high')) return 'high';
    if (severities.includes('medium')) return 'medium';
    if (severities.includes('low')) return 'low';
    return null;
  };

  return (
    <Card title="Recent Reviews" noPadding className="col-span-full mt-6">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-[var(--text-secondary)]">
          <thead className="bg-[var(--bg-tertiary)] text-xs uppercase text-[var(--text-secondary)] border-b border-[var(--border)]">
            <tr>
              <th scope="col" className="px-6 py-3">PR</th>
              <th scope="col" className="px-6 py-3">Repository</th>
              <th scope="col" className="px-6 py-3">Findings</th>
              <th scope="col" className="px-6 py-3">Max Severity</th>
              <th scope="col" className="px-6 py-3">Status</th>
              <th scope="col" className="px-6 py-3">Time</th>
            </tr>
          </thead>
          <tbody>
            {reviews.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-[var(--text-secondary)]">
                  No recent reviews found.
                </td>
              </tr>
            ) : (
              reviews.map((review) => (
                <tr 
                  key={review.id} 
                  className="border-b border-[var(--border)] hover:bg-[var(--bg-tertiary)] cursor-pointer transition-colors"
                  onClick={() => navigate(`/reviews/${review.id}`)}
                >
                  <td className="px-6 py-4 font-medium text-[var(--text-primary)]">
                    #{review.prNumber}
                  </td>
                  <td className="px-6 py-4">
                    {review.repo?.owner}/{review.repo?.name}
                  </td>
                  <td className="px-6 py-4">
                    {review._count?.findings || review.findings?.length || 0}
                  </td>
                  <td className="px-6 py-4">
                    <SeverityBadge severity={getHighestSeverity(review.findings)} />
                  </td>
                  <td className="px-6 py-4">
                    <Badge
                      variant="outline"
                      className={
                        review.status === 'completed' ? 'text-green-500 border-green-500/20 bg-green-500/10' :
                        review.status === 'error' ? 'text-red-500 border-red-500/20 bg-red-500/10' :
                        'text-yellow-500 border-yellow-500/20 bg-yellow-500/10'
                      }
                    >
                      {review.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
