import React from 'react';
import { useParams } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { RepoDetail } from '../components/repo/RepoDetail';
import { useApi } from '../hooks/useApi';
import { fetchRepo } from '../lib/api';
import { Loader2 } from 'lucide-react';

const RepoPage: React.FC = () => {
  const { repoId } = useParams<{ repoId: string }>();
  const { data: repo, loading, error } = useApi(() => fetchRepo(repoId!), [repoId]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (error || !repo) {
    return (
      <div className="p-8 text-center text-red-500">
        Failed to load repository details.
      </div>
    );
  }

  return (
    <div className="flex-1 pb-8">
      <Header 
        title={`${repo.owner}/${repo.name}`} 
        subtitle="Manage repository settings and view insights" 
      />
      <div className="px-8 mt-6">
        <RepoDetail repo={repo} />
      </div>
    </div>
  );
};

export default RepoPage;
