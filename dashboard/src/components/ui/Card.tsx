import React from 'react';
import { clsx, type ClassValue } from 'clsx';

function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  noPadding?: boolean;
}

export const Card: React.FC<CardProps> = ({ className, title, noPadding, children, ...props }) => {
  return (
    <div
      className={cn(
        'rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] shadow-sm overflow-hidden',
        className
      )}
      {...props}
    >
      {title && (
        <div className="border-b border-[var(--border)] px-6 py-4">
          <h3 className="text-lg font-medium leading-6 text-[var(--text-primary)]">{title}</h3>
        </div>
      )}
      <div className={cn({ 'p-6': !noPadding })}>{children}</div>
    </div>
  );
};
