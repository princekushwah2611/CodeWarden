import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Repository } from '../../types';
import { updateRepoSettings } from '../../lib/api';

interface RepoSettingsProps {
  repo: Repository;
}

export const RepoSettings: React.FC<RepoSettingsProps> = ({ repo }) => {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    severityThreshold: repo.severityThreshold,
    autoApprove: repo.autoApprove,
    ignoredPatterns: repo.ignoredPatterns,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateRepoSettings(repo.id, formData);
      alert('Settings saved successfully');
    } catch (err) {
      console.error('Failed to save settings', err);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="Repository Settings">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)]">
            Severity Threshold
          </label>
          <p className="text-sm text-[var(--text-secondary)] mb-2">
            Minimum severity level to comment on PRs.
          </p>
          <select
            value={formData.severityThreshold}
            onChange={(e) => setFormData({ ...formData, severityThreshold: e.target.value })}
            className="mt-1 block w-full rounded-md border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)] px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="low">Low (All issues)</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical Only</option>
          </select>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)]">
              Auto-Approve PRs
            </label>
            <p className="text-sm text-[var(--text-secondary)]">
              Automatically approve pull requests if no issues are found above the threshold.
            </p>
          </div>
          <div className="flex items-center h-6">
            <input
              type="checkbox"
              checked={formData.autoApprove}
              onChange={(e) => setFormData({ ...formData, autoApprove: e.target.checked })}
              className="h-4 w-4 rounded border-[var(--border)] bg-[var(--bg-primary)] text-indigo-600 focus:ring-indigo-600"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)]">
            Ignored File Patterns
          </label>
          <p className="text-sm text-[var(--text-secondary)] mb-2">
            Comma-separated glob patterns (e.g., *.test.js, src/generated/**)
          </p>
          <textarea
            rows={3}
            value={formData.ignoredPatterns}
            onChange={(e) => setFormData({ ...formData, ignoredPatterns: e.target.value })}
            className="mt-1 block w-full rounded-md border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)] px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
            placeholder="*.test.ts, docs/**, package-lock.json"
          />
        </div>

        <div className="flex justify-end">
          <Button type="submit" isLoading={saving}>
            Save Settings
          </Button>
        </div>
      </form>
    </Card>
  );
};
