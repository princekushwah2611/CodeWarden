import React from 'react';
import { Finding } from '../../types';
import { FileCode2 } from 'lucide-react';
import { clsx } from 'clsx';

interface DiffViewerProps {
  findings: Finding[];
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ findings }) => {
  // Group findings by file
  const fileFindings = findings.reduce((acc, finding) => {
    if (!acc[finding.file]) {
      acc[finding.file] = [];
    }
    acc[finding.file].push(finding);
    return acc;
  }, {} as Record<string, Finding[]>);

  if (Object.keys(fileFindings).length === 0) {
    return (
      <div className="text-center text-[var(--text-secondary)] mt-12">
        <p>No findings for this review. Good to go!</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {Object.entries(fileFindings).map(([file, fileGroup]) => (
        <div key={file} className="rounded-lg border border-[var(--border)] overflow-hidden bg-[var(--bg-secondary)]">
          <div className="bg-[var(--bg-tertiary)] border-b border-[var(--border)] px-4 py-2 flex items-center">
            <FileCode2 className="w-4 h-4 text-[var(--text-secondary)] mr-2" />
            <span className="text-sm font-mono text-[var(--text-primary)]">{file}</span>
            <span className="ml-auto text-xs text-[var(--text-secondary)]">{fileGroup.length} finding(s)</span>
          </div>
          
          <div className="p-4 font-mono text-sm overflow-x-auto">
            {/* 
              This is a placeholder for an actual diff viewer.
              In a real implementation, you would parse the diff string from the backend.
              Here we just show the lines where findings occurred as a proxy.
            */}
            {fileGroup.map((finding) => (
              <div 
                key={finding.id} 
                className={clsx(
                  "mb-6 rounded border p-4",
                  finding.severity === 'critical' ? 'border-red-500/30 bg-red-500/5' :
                  finding.severity === 'high' ? 'border-amber-500/30 bg-amber-500/5' :
                  finding.severity === 'medium' ? 'border-blue-500/30 bg-blue-500/5' :
                  'border-gray-400/30 bg-gray-400/5'
                )}
              >
                <div className="mb-2 text-xs text-[var(--text-secondary)] flex justify-between">
                  <span>Lines: {finding.lineStart} - {finding.lineEnd || finding.lineStart}</span>
                  <span className="capitalize">{finding.severity} {finding.type}</span>
                </div>
                <div className="text-[var(--text-primary)] whitespace-pre-wrap">{finding.explanation}</div>
                <div className="mt-3 p-3 bg-[var(--bg-primary)] rounded border border-[var(--border)]">
                  <div className="text-xs text-[var(--text-secondary)] mb-1 uppercase tracking-wider">Suggestion</div>
                  <code className="text-indigo-300">{finding.suggestion}</code>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
