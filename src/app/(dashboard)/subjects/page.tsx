'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogTitle } from '@/components/ui/dialog';

interface Subject { id: string; name: string; emoji: string; description: string; masteryLevel: number; }

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', emoji: '📚', description: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetch('/api/subjects').then(r => r.json()).then(setSubjects); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault(); setLoading(true);
    const res = await fetch('/api/subjects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    if (res.ok) { const s = await res.json(); setSubjects(p => [s, ...p]); setOpen(false); setForm({ name: '', emoji: '📚', description: '' }); }
    setLoading(false);
  }

  async function remove(id: string) {
    await fetch(`/api/subjects/${id}`, { method: 'DELETE' });
    setSubjects(p => p.filter(s => s.id !== id));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Subjects</h1>
        <Button onClick={() => setOpen(true)}>+ New Subject</Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {subjects.map(s => (
          <Card key={s.id} className="hover:border-emerald-200 transition-colors">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-3">
                <span className="text-3xl">{s.emoji}</span>
                <button onClick={() => remove(s.id)} className="text-slate-600 hover:text-red-600 text-sm transition-colors">✕</button>
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">{s.name}</h3>
              <p className="text-sm text-slate-600 mb-3">{s.description || 'No description'}</p>
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full" style={{ width: `${s.masteryLevel * 100}%` }} />
                </div>
                <span className="text-xs text-slate-600">{Math.round(s.masteryLevel * 100)}%</span>
              </div>
            </CardContent>
          </Card>
        ))}
        {subjects.length === 0 && (
          <div className="col-span-3 text-center py-20 text-slate-500">
            No subjects yet. Create your first one!
          </div>
        )}
      </div>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>New Subject</DialogTitle>
        <form onSubmit={create} className="space-y-4">
          <div className="flex gap-3">
            <div className="space-y-1.5 w-20">
              <Label>Emoji</Label>
              <Input value={form.emoji} onChange={e => setForm(p => ({ ...p, emoji: e.target.value }))} maxLength={2} className="text-center text-xl" />
            </div>
            <div className="space-y-1.5 flex-1">
              <Label>Name *</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Biology" required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Optional description" />
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Creating…' : 'Create'}</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
