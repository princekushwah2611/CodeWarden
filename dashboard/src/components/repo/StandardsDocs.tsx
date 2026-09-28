import React, { useState } from 'react';
import { RefreshCw, Trash2, Upload, File } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { StandardsDocument } from '../../types';
import { useApi } from '../../hooks/useApi';
import { fetchStandardsDocs, uploadStandardsDoc, deleteStandardsDoc, reindexStandardsDoc } from '../../lib/api';

interface StandardsDocsProps {
  repoId: string;
}

export const StandardsDocs: React.FC<StandardsDocsProps> = ({ repoId }) => {
  const { data: docs, loading, refetch } = useApi(() => fetchStandardsDocs(repoId), [repoId]);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;
    setUploading(true);
    try {
      await uploadStandardsDoc(repoId, selectedFile);
      setSelectedFile(null);
      refetch();
    } catch (err) {
      console.error('Failed to upload', err);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: string) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      await deleteStandardsDoc(repoId, docId);
      refetch();
    } catch (err) {
      console.error('Failed to delete', err);
    }
  };

  const handleReindex = async (docId: string) => {
    try {
      await reindexStandardsDoc(repoId, docId);
      alert('Reindexing started');
    } catch (err) {
      console.error('Failed to reindex', err);
    }
  };

  return (
    <div className="space-y-6">
      <Card title="Upload New Standards Document">
        <form onSubmit={handleUpload} className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Select Markdown or Text File
            </label>
            <input
              type="file"
              accept=".md,.txt,.json,.yml,.yaml"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-[var(--text-secondary)] file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-[var(--bg-tertiary)] file:text-white hover:file:bg-[var(--border)] cursor-pointer"
            />
          </div>
          <Button type="submit" disabled={!selectedFile || uploading} isLoading={uploading}>
            <Upload className="w-4 h-4 mr-2" />
            Upload
          </Button>
        </form>
      </Card>

      <Card title="Existing Documents" noPadding>
        {loading ? (
          <div className="p-6 text-center text-[var(--text-secondary)]">Loading...</div>
        ) : docs?.length === 0 ? (
          <div className="p-12 text-center text-[var(--text-secondary)]">
            <File className="w-12 h-12 mx-auto text-[var(--border)] mb-4" />
            <p>No standards doc yet — upload one to enable smart suggestions</p>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {docs?.map((doc) => (
              <li key={doc.id} className="p-6 flex items-center justify-between hover:bg-[var(--bg-tertiary)] transition-colors">
                <div className="flex items-center">
                  <File className="w-5 h-5 text-indigo-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{doc.sourceFile}</p>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">
                      {doc.chunkCount} chunks • Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => handleReindex(doc.id)}>
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => handleDelete(doc.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};
