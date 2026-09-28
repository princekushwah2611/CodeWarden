import React, { useState } from 'react';
import { Repository } from '../../types';
import { Card } from '../ui/Card';
import { StandardsDocs } from './StandardsDocs';
import { RepoSettings } from './RepoSettings';
import { FileText, Shield, Activity } from 'lucide-react';
import { StatCard } from '../dashboard/StatCard';

interface RepoDetailProps {
  repo: Repository;
}

export const RepoDetail: React.FC<RepoDetailProps> = ({ repo }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'docs' | 'settings'>('overview');

  return (
    <div className="space-y-6">
      <div className="border-b border-[var(--border)]">
        <nav className="-mb-px flex space-x-8">
          {(['overview', 'docs', 'settings'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`${
                activeTab === tab
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-[var(--text-secondary)] hover:border-[var(--border)] hover:text-[var(--text-primary)]'
              } whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium capitalize`}
            >
              {tab === 'docs' ? 'Standards Docs' : tab}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              title="Total Reviews"
              value={repo._count?.reviews || 0}
              icon={FileText}
            />
            <StatCard
              title="Standards Docs"
              value={repo._count?.standardsDocs || 0}
              icon={Shield}
            />
            <StatCard
              title="Health Score"
              value="92%"
              icon={Activity}
              trend="up"
              change="+2%"
            />
          </div>
        )}

        {activeTab === 'docs' && <StandardsDocs repoId={repo.id} />}
        
        {activeTab === 'settings' && <RepoSettings repo={repo} />}
      </div>
    </div>
  );
};
