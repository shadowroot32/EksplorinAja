import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'outline';
}

const variants = {
  default: 'border border-emerald-200 bg-emerald-50 text-emerald-700',
  secondary: 'border border-slate-200 bg-slate-100 text-slate-600',
  outline: 'border border-slate-200 bg-white text-slate-600',
};

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', variants[variant], className)} {...props} />;
}
