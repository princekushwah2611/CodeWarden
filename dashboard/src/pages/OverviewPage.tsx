import React from 'react';
import { Header } from '../components/layout/Header';
import { StatCard } from '../components/dashboard/StatCard';
import { TrendChart } from '../components/dashboard/TrendChart';
import { RecentReviews } from '../components/dashboard/RecentReviews';
import { FileText, AlertTriangle, Clock, Shield } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { fetchOverviewStats, fetchTrends, fetchRepoReviews } from '../lib/api';

const OverviewPage: React.FC = () => {
  // Using empty arrays/default fallback data while loading or if API fails
  const { data: stats } = useApi(fetchOverviewStats);
  const { data: trends } = useApi(() => fetchTrends(30));
  
  // For overview, we might need an endpoint for global recent reviews, 
  // but using fetchRepoReviews with a dummy/empty string for now or a dedicated endpoint.
  // We'll mock it for the UI structure if not available.
  const mockReviews = [
    {
      id: '1',
      prNumber: 42,
      repoId: 'repo-1',
      status: 'completed',
      actionTaken: 'commented',
      summary: null,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      durationMs: 45000,
      repo: {
        id: 'repo-1',
        githubRepoId: 101,
        name: 'frontend-core',
        owner: 'acme-corp',
        severityThreshold: 'medium',
        autoApprove: false,
        ignoredPatterns: '',
        createdAt: new Date().toISOString(),
      },
      findings: [
        { severity: 'high', type: 'security' },
        { severity: 'medium', type: 'standards' }
      ]
    }
  ];

  return (
    <div className="flex-1 space-y-6 pb-8">
      <Header title="Overview" subtitle="Monitor your code review operations" />
      
      <div className="px-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Reviews"
            value={stats?.totalReviews || 0}
            icon={FileText}
            change="+12%"
            trend="up"
          />
          <StatCard
            title="Critical Issues"
            value={stats?.criticalIssues || 0}
            icon={AlertTriangle}
            change="-4%"
            trend="down"
          />
          <StatCard
            title="Avg Response Time"
            value={`${Math.round((stats?.avgTimeMs || 0) / 1000)}s`}
            icon={Clock}
          />
          <StatCard
            title="Health Score"
            value={`${stats?.healthScore || 100}%`}
            icon={Shield}
            change="+1%"
            trend="up"
          />
        </div>

        <div className="mt-8">
          <TrendChart data={trends || []} />
        </div>

        <div className="mt-8">
          <RecentReviews reviews={mockReviews as any} />
        </div>
      </div>
    </div>
  );
};

export default OverviewPage;
