'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function Dialog({ open, onClose, children }: DialogProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
      <button type="button" aria-label="Close dialog" className="fixed inset-0 bg-slate-950/35 backdrop-blur-sm" onClick={onClose} />
      <div role="dialog" aria-modal="true" className="relative z-10 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-900/15">{children}</div>
    </div>
  );
}

export function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('mb-4 text-lg font-bold text-slate-900', className)} {...props} />;
}
