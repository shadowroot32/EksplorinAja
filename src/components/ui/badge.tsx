import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'outline';
}

const variants = {
  default: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  secondary: 'bg-slate-800 text-slate-300 border border-slate-700',
  outline: 'bg-transparent text-slate-300 border border-slate-700',
};

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', variants[variant], className)}
      {...props}
    />
  );
}
