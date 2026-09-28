import React, { useState } from 'react';
import { Finding } from '../../types';
import { SeverityBadge } from '../ui/SeverityBadge';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { ChevronDown, ChevronUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { markFalsePositive } from '../../lib/api';

interface FindingCardProps {
  finding: Finding;
}

export const FindingCard: React.FC<FindingCardProps> = ({ finding }) => {
  const [expanded, setExpanded] = useState(false);
  const [isFalsePositive, setIsFalsePositive] = useState(finding.falsePositive);
  const [loading, setLoading] = useState(false);

  const handleMarkFalsePositive = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFalsePositive) return;
    
    setLoading(true);
    try {
      await markFalsePositive(finding.id);
      setIsFalsePositive(true);
    } catch (err) {
      console.error('Failed to mark as false positive', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className={`border-b border-[var(--border)] p-4 hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer ${isFalsePositive ? 'opacity-60' : ''}`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex gap-2 items-center flex-wrap">
          <SeverityBadge severity={finding.severity} />
          <Badge variant="outline" size="sm" className="capitalize text-xs">
            {finding.type}
          </Badge>
          {isFalsePositive && (
            <Badge variant="outline" size="sm" className="text-green-500 border-green-500 bg-green-500/10">
              <CheckCircle2 className="w-3 h-3 mr-1" /> False Positive
            </Badge>
          )}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-[var(--text-secondary)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-secondary)]" />}
      </div>
      
      <p className="text-sm font-mono text-[var(--text-primary)] break-all mb-1">
        {finding.file}
      </p>
      
      <p className="text-xs text-[var(--text-secondary)] mb-2">
        Lines: {finding.lineStart}{finding.lineEnd && finding.lineEnd !== finding.lineStart ? ` - ${finding.lineEnd}` : ''}
      </p>
      
      <p className="text-sm text-[var(--text-primary)] line-clamp-2">
        {finding.explanation}
      </p>

      {expanded && (
        <div className="mt-4 space-y-4" onClick={e => e.stopPropagation()}>
          <div>
            <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Full Explanation</h4>
            <p className="text-sm text-[var(--text-primary)]">{finding.explanation}</p>
          </div>
          
          <div>
            <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Suggestion</h4>
            <div className="bg-[var(--bg-primary)] p-3 rounded-md border border-[var(--border)] font-mono text-sm text-indigo-300 whitespace-pre-wrap">
              {finding.suggestion}
            </div>
          </div>
          
          {finding.ruleId && (
            <div>
              <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Rule ID</h4>
              <p className="text-xs font-mono text-[var(--text-primary)]">{finding.ruleId}</p>
            </div>
          )}

          {!isFalsePositive && (
            <div className="pt-2 border-t border-[var(--border)]">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-[var(--text-secondary)] hover:text-red-400 w-full justify-center"
                onClick={handleMarkFalsePositive}
                isLoading={loading}
              >
                <AlertCircle className="w-4 h-4 mr-2" />
                Mark as False Positive
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
