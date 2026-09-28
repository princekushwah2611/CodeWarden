import React from 'react';
import { Review, Finding } from '../../types';
import { DiffViewer } from './DiffViewer';
import { FindingsSidebar } from './FindingsSidebar';
import { Badge } from '../ui/Badge';

interface ReviewDetailProps {
  review: Review;
}

export const ReviewDetail: React.FC<ReviewDetailProps> = ({ review }) => {
  const findings = review.findings || [];
  
  return (
    <div className="flex h-[calc(100vh-89px)] w-full overflow-hidden">
      <div className="flex-1 flex flex-col border-r border-[var(--border)] overflow-hidden">
        <div className="bg-[var(--bg-secondary)] border-b border-[var(--border)] p-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              PR #{review.prNumber} Review
            </h2>
            <p className="text-sm text-[var(--text-secondary)]">
              {review.repo?.owner}/{review.repo?.name}
            </p>
          </div>
          <div className="flex gap-2">
            <Badge
              variant="outline"
              className={
                review.status === 'completed' ? 'text-green-500 border-green-500/20 bg-green-500/10' :
                review.status === 'error' ? 'text-red-500 border-red-500/20 bg-red-500/10' :
                'text-yellow-500 border-yellow-500/20 bg-yellow-500/10'
              }
            >
              Status: {review.status}
            </Badge>
            {review.actionTaken && (
              <Badge variant="outline" className="text-indigo-400 border-indigo-400/20 bg-indigo-400/10">
                Action: {review.actionTaken}
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto bg-[var(--bg-primary)] p-6">
          {review.summary && (
            <div className="mb-6 p-4 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)]">
              <h3 className="text-sm font-medium text-[var(--text-primary)] mb-2">AI Summary</h3>
              <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">{review.summary}</p>
            </div>
          )}
          
          <DiffViewer findings={findings} />
        </div>
      </div>
      
      <div className="w-96 flex-shrink-0 bg-[var(--bg-secondary)] overflow-y-auto">
        <FindingsSidebar findings={findings} />
      </div>
    </div>
  );
};
