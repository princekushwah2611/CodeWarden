import React from 'react';
import { Card } from '../ui/Card';
import { LucideIcon } from 'lucide-react';
import { clsx } from 'clsx';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, change, icon: Icon, trend }) => {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--text-secondary)]">{title}</p>
          <div className="mt-2 flex items-baseline">
            <p className="text-3xl font-semibold text-[var(--text-primary)]">{value}</p>
            {change && (
              <p
                className={clsx('ml-2 text-sm font-medium', {
                  'text-green-500': trend === 'up',
                  'text-red-500': trend === 'down',
                  'text-gray-400': trend === 'neutral' || !trend,
                })}
              >
                {change}
              </p>
            )}
          </div>
        </div>
        <div className="rounded-full bg-[var(--bg-tertiary)] p-3 border border-[var(--border)]">
          <Icon className="h-6 w-6 text-[var(--text-secondary)]" />
        </div>
      </div>
    </Card>
  );
};
