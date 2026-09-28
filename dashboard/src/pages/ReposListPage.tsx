import React from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { GitBranch, FileText, Shield } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { fetchRepos } from '../lib/api';

const ReposListPage: React.FC = () => {
  const { data: repos, loading } = useApi(fetchRepos);

  return (
    <div className="flex-1 pb-8">
      <Header title="Repositories" subtitle="All connected repositories" />
      
      <div className="px-8 mt-6">
        {loading ? (
          <div className="text-[var(--text-secondary)]">Loading repositories...</div>
        ) : repos?.length === 0 ? (
          <div className="text-center p-12 border border-dashed border-[var(--border)] rounded-xl">
            <GitBranch className="mx-auto h-12 w-12 text-[var(--text-secondary)] mb-4" />
            <h3 className="text-lg font-medium text-[var(--text-primary)]">No repositories connected</h3>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Install the CodeWarden GitHub App to get started.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {repos?.map((repo) => (
              <Link key={repo.id} to={`/repos/${repo.id}`} className="block">
                <Card className="hover:border-indigo-500/50 transition-colors cursor-pointer h-full">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-[var(--text-primary)] truncate">
                      {repo.owner}/{repo.name}
                    </h3>
                    <Badge variant="outline" className="capitalize">
                      Threshold: {repo.severityThreshold}
                    </Badge>
                  </div>
                  
                  <div className="flex gap-6 mt-6">
                    <div className="flex items-center text-sm text-[var(--text-secondary)]">
                      <FileText className="w-4 h-4 mr-2 text-[var(--border)]" />
                      {repo._count?.reviews || 0} reviews
                    </div>
                    <div className="flex items-center text-sm text-[var(--text-secondary)]">
                      <Shield className="w-4 h-4 mr-2 text-[var(--border)]" />
                      {repo._count?.standardsDocs || 0} docs
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReposListPage;
