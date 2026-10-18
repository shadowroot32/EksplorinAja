'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface StudySet { id: string; title: string; sourceType: string; summary: string; createdAt: string; }

type Tab = 'text' | 'youtube' | 'pdf';

export default function LibraryPage() {
  const [sets, setSets] = useState<StudySet[]>([]);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('text');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', url: '' });
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');

  useEffect(() => { fetch('/api/study-sets').then(r => r.json()).then(setSets); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      let res: Response;
      if (tab === 'pdf' && file) {
        const fd = new FormData();
        fd.append('title', form.title); fd.append('sourceType', 'pdf'); fd.append('file', file);
        res = await fetch('/api/study-sets', { method: 'POST', body: fd });
      } else if (tab === 'youtube') {
        res = await fetch('/api/study-sets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: form.title, sourceType: 'youtube', url: form.url }) });
      } else {
        res = await fetch('/api/study-sets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: form.title, sourceType: 'text', content: form.content }) });
      }
      if (res.ok) { const s = await res.json(); setSets(p => [s, ...p]); setOpen(false); setForm({ title: '', content: '', url: '' }); }
      else setError((await res.json()).error ?? 'Failed');
    } catch { setError('Network error'); }
    setLoading(false);
  }

  async function remove(id: string) {
    await fetch(`/api/study-sets/${id}`, { method: 'DELETE' });
    setSets(p => p.filter(s => s.id !== id));
  }

  const tabCls = (t: Tab) => `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400 hover:text-slate-200'}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100">Library</h1>
        <Button onClick={() => setOpen(true)}>+ New Study Set</Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sets.map(s => (
          <Card key={s.id} className="hover:border-emerald-500/30 transition-colors">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-2">
                <Badge>{s.sourceType}</Badge>
                <button onClick={() => remove(s.id)} className="text-slate-600 hover:text-red-400 text-sm transition-colors">✕</button>
              </div>
              <h3 className="font-semibold text-slate-100 mb-1">{s.title}</h3>
              <p className="text-sm text-slate-400 line-clamp-2 mb-4">{s.summary || 'Processing…'}</p>
              <Link href={`/study/${s.id}`} className="text-emerald-400 text-sm hover:underline">Study →</Link>
            </CardContent>
          </Card>
        ))}
        {sets.length === 0 && <div className="col-span-3 text-center py-20 text-slate-500">No study sets yet. Create your first one!</div>}
      </div>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>New Study Set</DialogTitle>
        <form onSubmit={create} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Title *</Label>
            <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Study set title" required />
          </div>
          <div className="flex gap-1 bg-slate-800 p-1 rounded-lg">
            {(['text', 'youtube', 'pdf'] as Tab[]).map(t => <button key={t} type="button" onClick={() => setTab(t)} className={tabCls(t)}>{t === 'text' ? '📝 Text' : t === 'youtube' ? '▶️ YouTube' : '📄 PDF'}</button>)}
          </div>
          {tab === 'text' && <div className="space-y-1.5"><Label>Content *</Label><textarea className="w-full min-h-[120px] rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} placeholder="Paste your study material…" required /></div>}
          {tab === 'youtube' && <div className="space-y-1.5"><Label>YouTube URL *</Label><Input value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))} placeholder="https://youtube.com/watch?v=..." required /></div>}
          {tab === 'pdf' && <div className="space-y-1.5"><Label>PDF File *</Label><input type="file" accept=".pdf" onChange={e => setFile(e.target.files?.[0] ?? null)} className="text-sm text-slate-300" required /></div>}
          {error && <p className="text-red-400 text-sm">{error}</p>}
          {loading && <p className="text-emerald-400 text-sm">Generating AI content… this may take a moment.</p>}
          <div className="flex gap-3 justify-end">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Processing…' : 'Create'}</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
