import React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'link';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

const base = 'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:pointer-events-none disabled:opacity-50';
const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
  default: 'bg-emerald-500 text-white hover:bg-emerald-600',
  outline: 'border border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800',
  ghost: 'bg-transparent text-slate-200 hover:bg-slate-800',
  destructive: 'bg-red-600 text-white hover:bg-red-700',
  link: 'underline-offset-4 hover:underline text-emerald-400 p-0 h-auto',
};
const sizes: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-6 text-base',
  icon: 'h-9 w-9',
};

export function Button({ className, variant = 'default', size = 'md', ...props }: ButtonProps) {
  return <button className={cn(base, variants[variant], sizes[size], className)} {...props} />;
}
