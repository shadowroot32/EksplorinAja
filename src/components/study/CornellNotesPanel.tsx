'use client';

import { useEffect, useState } from 'react';

interface CornellFields { cues: string; notes: string; summary: string; reflection: string; }
const emptyFields: CornellFields = { cues: '', notes: '', summary: '', reflection: '' };
const inputClass = 'min-h-32 w-full resize-y rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50';

export default function CornellNotesPanel({ studySetId }: { studySetId: string }) {
  const [fields, setFields] = useState<CornellFields>(emptyFields);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/study-sets/${studySetId}/cornell`)
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || 'Could not load Cornell notes');
        if (!cancelled) {
          setFields({ cues: payload.cues ?? '', notes: payload.notes ?? '', summary: payload.summary ?? '', reflection: payload.reflection ?? '' });
          setSavedAt(payload.updatedAt ?? '');
        }
      })
      .catch(() => { if (!cancelled) setError('Cornell notes could not be loaded. Refresh and try again.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [studySetId]);

  function update(field: keyof CornellFields, value: string) {
    setFields((current) => ({ ...current, [field]: value }));
  }

  async function save() {
    setSaving(true);
    setError('');
    try {
      const response = await fetch(`/api/study-sets/${studySetId}/cornell`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Could not save notes');
      setSavedAt(payload.updatedAt ?? new Date().toISOString());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save notes');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-500">Loading Cornell notes…</div>;
  return <section className="space-y-5">
    <div className="rounded-3xl border border-blue-100 bg-gradient-to-br from-sky-50 to-white p-5 sm:p-6">
      <h2 className="text-xl font-black text-slate-950">Cornell Notes</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">Pisahkan kata kunci, catatan utama, ringkasan, dan refleksi untuk membantu mengingat materi.</p>
    </div>
    <div className="grid gap-4 md:grid-cols-[0.8fr_1.2fr]">
      <label className="block space-y-2 rounded-3xl border border-slate-200 bg-sky-50/70 p-4"><span className="text-sm font-extrabold text-slate-900">Cue / kata kunci</span><textarea maxLength={12000} className={inputClass} value={fields.cues} onChange={(event) => update('cues', event.target.value)} placeholder="Istilah penting, pertanyaan, petunjuk untuk mengingat…" /></label>
      <label className="block space-y-2 rounded-3xl border border-slate-200 bg-white p-4"><span className="text-sm font-extrabold text-slate-900">Catatan utama</span><textarea maxLength={20000} className={inputClass} value={fields.notes} onChange={(event) => update('notes', event.target.value)} placeholder="Penjelasan, fakta penting, contoh, rumus…" /></label>
      <label className="block space-y-2 rounded-3xl border border-slate-200 bg-white p-4"><span className="text-sm font-extrabold text-slate-900">Ringkasan dengan kata sendiri</span><textarea maxLength={8000} className={inputClass} value={fields.summary} onChange={(event) => update('summary', event.target.value)} placeholder="Apa inti materi ini dalam beberapa kalimat?" /></label>
      <label className="block space-y-2 rounded-3xl border border-slate-200 bg-white p-4"><span className="text-sm font-extrabold text-slate-900">Refleksi / pertanyaan lanjutan</span><textarea maxLength={8000} className={inputClass} value={fields.reflection} onChange={(event) => update('reflection', event.target.value)} placeholder="Apa yang masih membingungkan? Apa yang perlu dipelajari lagi?" /></label>
    </div>
    {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    <div className="flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-slate-500">{savedAt ? 'Saved ' + new Date(savedAt).toLocaleString() : 'Not saved yet'}</span><button type="button" disabled={saving} onClick={() => void save()} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-blue-700 disabled:opacity-50">{saving ? 'Saving…' : 'Save Cornell Notes'}</button></div>
  </section>;
}
