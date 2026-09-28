import React from 'react';
import { Finding, Severity } from '../../types';
import { FindingCard } from './FindingCard';

interface FindingsSidebarProps {
  findings: Finding[];
}

export const FindingsSidebar: React.FC<FindingsSidebarProps> = ({ findings }) => {
  const groupFindings = (severity: Severity) => 
    findings.filter(f => f.severity === severity);

  const critical = groupFindings('critical');
  const high = groupFindings('high');
  const medium = groupFindings('medium');
  const low = groupFindings('low');

  const renderGroup = (title: string, group: Finding[], colorClass: string) => {
    if (group.length === 0) return null;
    
    return (
      <div className="mb-6">
        <div className="flex items-center justify-between px-4 py-2 bg-[var(--bg-tertiary)] border-y border-[var(--border)]">
          <h3 className={`text-sm font-semibold uppercase tracking-wider ${colorClass}`}>{title}</h3>
          <span className="text-xs font-medium text-[var(--text-secondary)] bg-[var(--bg-primary)] px-2 py-0.5 rounded-full border border-[var(--border)]">
            {group.length}
          </span>
        </div>
        <div>
          {group.map(finding => (
            <FindingCard key={finding.id} finding={finding} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="py-4 h-full">
      <div className="px-4 pb-4 border-b border-[var(--border)]">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Findings</h2>
        <p className="text-sm text-[var(--text-secondary)]">Total: {findings.length}</p>
      </div>
      
      <div className="mt-4">
        {findings.length === 0 ? (
          <div className="px-4 text-sm text-[var(--text-secondary)] text-center mt-8">
            No issues found in this review.
          </div>
        ) : (
          <>
            {renderGroup('Critical', critical, 'text-red-500')}
            {renderGroup('High', high, 'text-amber-500')}
            {renderGroup('Medium', medium, 'text-blue-500')}
            {renderGroup('Low', low, 'text-gray-400')}
          </>
        )}
      </div>
    </div>
  );
};
