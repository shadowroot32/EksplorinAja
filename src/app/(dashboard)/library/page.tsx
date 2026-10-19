'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { usePreferences } from '@/components/providers/PreferencesProvider';

interface StudySet { id: string; title: string; sourceType: string; summary: string; createdAt: string; }
type Tab = 'text' | 'youtube' | 'pdf';

export default function LibraryPage() {
  const { t: tr } = usePreferences();
  const [sets, setSets] = useState<StudySet[]>([]);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('text');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', url: '' });
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/study-sets')
      .then((response) => response.json())
      .then((payload) => { if (!cancelled) setSets(Array.isArray(payload) ? payload : []); })
      .catch(() => { if (!cancelled) setError(tr('library.networkError')); });
    return () => { cancelled = true; };
  }, [tr]);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      let response: Response;
      if (tab === 'pdf' && file) {
        const body = new FormData();
        body.append('title', form.title);
        body.append('sourceType', 'pdf');
        body.append('file', file);
        response = await fetch('/api/study-sets', { method: 'POST', body });
      } else if (tab === 'youtube') {
        response = await fetch('/api/study-sets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: form.title, sourceType: 'youtube', url: form.url }),
        });
      } else {
        response = await fetch('/api/study-sets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: form.title, sourceType: 'text', content: form.content }),
        });
      }
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || tr('library.failed'));
      setSets((current) => [payload as StudySet, ...current]);
      setOpen(false);
      setForm({ title: '', content: '', url: '' });
      setFile(null);
      setTab('text');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : tr('library.networkError'));
    } finally {
      setLoading(false);
    }
  }

  async function remove(id: string) {
    try {
      const response = await fetch('/api/study-sets/' + id, { method: 'DELETE' });
      if (response.ok) setSets((current) => current.filter((item) => item.id !== id));
      else setError(tr('library.failed'));
    } catch {
      setError(tr('library.networkError'));
    }
  }

  const tabCls = (tabValue: Tab) => 'rounded-lg px-4 py-2 text-sm font-medium transition-colors ' + (
    tab === tabValue
      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200'
      : 'text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white'
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{tr('library.title')}</h1>
        <Button onClick={() => setOpen(true)}>+ {tr('library.newSet')}</Button>
      </div>

      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sets.map((item) => (
          <Card key={item.id} className="transition-colors hover:border-emerald-200">
            <CardContent className="pt-6">
              <div className="mb-2 flex items-start justify-between">
                <Badge>{item.sourceType}</Badge>
                <button type="button" onClick={() => void remove(item.id)} aria-label={tr('library.remove')} className="text-sm text-slate-600 transition-colors hover:text-red-600">✕</button>
              </div>
              <h3 className="mb-1 font-semibold text-slate-900 dark:text-slate-100">{item.title}</h3>
              <p className="mb-4 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{item.summary || tr('library.processing')}</p>
              <Link href={'/study/' + item.id} className="text-sm text-emerald-700 hover:underline dark:text-emerald-300">{tr('library.study')} →</Link>
            </CardContent>
          </Card>
        ))}
        {sets.length === 0 && <div className="col-span-full py-20 text-center text-slate-500">{tr('library.noSets')}</div>}
      </div>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>{tr('library.dialogTitle')}</DialogTitle>
        <form onSubmit={create} className="space-y-4">
          <div className="space-y-1.5">
            <Label>{tr('library.titleLabel')}</Label>
            <Input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder={tr('library.titlePlaceholder')} required />
          </div>
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
            {(['text', 'youtube', 'pdf'] as Tab[]).map((tabValue) => (
              <button key={tabValue} type="button" onClick={() => setTab(tabValue)} className={tabCls(tabValue)}>
                {tabValue === 'text' ? '📝 ' + tr('library.text') : tabValue === 'youtube' ? '▶️ YouTube' : '📄 PDF'}
              </button>
            ))}
          </div>
          {tab === 'text' && <div className="space-y-1.5">
            <Label>{tr('library.content')}</Label>
            <textarea className="min-h-[120px] w-full resize-none rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" value={form.content} onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))} placeholder={tr('library.contentPlaceholder')} required />
          </div>}
          {tab === 'youtube' && <div className="space-y-1.5">
            <Label>{tr('library.youtubeUrl')}</Label>
            <Input value={form.url} onChange={(event) => setForm((current) => ({ ...current, url: event.target.value }))} placeholder="https://youtube.com/watch?v=..." required />
          </div>}
          {tab === 'pdf' && <div className="space-y-1.5">
            <Label>{tr('library.pdfFile')}</Label>
            <input type="file" accept=".pdf,application/pdf" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="text-sm text-slate-700 dark:text-slate-300" required />
          </div>}
          {loading && <p className="text-sm text-emerald-700 dark:text-emerald-300">{tr('library.generating')}</p>}
          <div className="flex justify-end gap-3">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>{tr('library.cancel')}</Button>
            <Button type="submit" disabled={loading}>{loading ? tr('library.processing') : tr('library.create')}</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
