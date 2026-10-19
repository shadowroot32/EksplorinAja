'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogTitle } from '@/components/ui/dialog';
import { usePreferences } from '@/components/providers/PreferencesProvider';

interface Subject { id: string; name: string; emoji: string; description: string; masteryLevel: number; }

export default function SubjectsPage() {
  const { t: tr } = usePreferences();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', emoji: '📚', description: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/subjects')
      .then((response) => response.json())
      .then((payload) => { if (!cancelled) setSubjects(Array.isArray(payload) ? payload : []); })
      .catch(() => { if (!cancelled) setError(tr('subjects.loadError')); });
    return () => { cancelled = true; };
  }, [tr]);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || tr('subjects.createError'));
      setSubjects((current) => [payload as Subject, ...current]);
      setOpen(false);
      setForm({ name: '', emoji: '📚', description: '' });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : tr('subjects.createError'));
    } finally {
      setLoading(false);
    }
  }

  async function remove(id: string) {
    try {
      const response = await fetch('/api/subjects/' + id, { method: 'DELETE' });
      if (response.ok) setSubjects((current) => current.filter((subject) => subject.id !== id));
      else setError(tr('subjects.deleteError'));
    } catch {
      setError(tr('subjects.deleteError'));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{tr('subjects.title')}</h1>
        <Button onClick={() => setOpen(true)}>+ {tr('subjects.new')}</Button>
      </div>
      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {subjects.map((subject) => (
          <Card key={subject.id} className="transition-colors hover:border-emerald-200">
            <CardContent className="pt-6">
              <div className="mb-3 flex items-start justify-between">
                <span className="text-3xl">{subject.emoji}</span>
                <button type="button" onClick={() => void remove(subject.id)} aria-label={tr('subjects.delete')} className="text-sm text-slate-600 transition-colors hover:text-red-600">✕</button>
              </div>
              <h3 className="mb-1 font-semibold text-slate-900 dark:text-slate-100">{subject.name}</h3>
              <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">{subject.description || tr('subjects.noDescription')}</p>
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-full rounded-full bg-blue-600" style={{ width: Math.max(0, Math.min(100, subject.masteryLevel * 100)) + '%' }} />
                </div>
                <span className="text-xs text-slate-600 dark:text-slate-300">{Math.round(subject.masteryLevel * 100)}%</span>
              </div>
            </CardContent>
          </Card>
        ))}
        {subjects.length === 0 && <div className="col-span-full py-20 text-center text-slate-500">{tr('subjects.empty')}</div>}
      </div>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>{tr('subjects.dialog')}</DialogTitle>
        <form onSubmit={create} className="space-y-4">
          <div className="flex gap-3">
            <div className="w-20 space-y-1.5">
              <Label>{tr('subjects.emoji')}</Label>
              <Input value={form.emoji} onChange={(event) => setForm((current) => ({ ...current, emoji: event.target.value }))} maxLength={2} className="text-center text-xl" />
            </div>
            <div className="flex-1 space-y-1.5">
              <Label>{tr('subjects.name')}</Label>
              <Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder={tr('subjects.namePlaceholder')} required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{tr('subjects.description')}</Label>
            <Input value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder={tr('subjects.descriptionPlaceholder')} />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>{tr('library.cancel')}</Button>
            <Button type="submit" disabled={loading}>{loading ? tr('subjects.creating') : tr('subjects.create')}</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
