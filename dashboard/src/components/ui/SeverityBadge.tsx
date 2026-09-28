import React from 'react';
import { Badge } from './Badge';

export type Severity = 'critical' | 'high' | 'medium' | 'low' | null;

interface SeverityBadgeProps {
  severity: Severity;
  className?: string;
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity, className }) => {
  if (!severity) return null;

  const colorMap = {
    critical: 'bg-red-500/10 text-red-500 border border-red-500/20',
    high: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
    medium: 'bg-blue-500/10 text-blue-500 border border-blue-500/20',
    low: 'bg-gray-400/10 text-gray-400 border border-gray-400/20',
  };

  return (
    <Badge
      variant="outline"
      size="sm"
      className={`${colorMap[severity]} uppercase tracking-wider text-[10px] ${className || ''}`}
    >
      {severity}
    </Badge>
  );
};
