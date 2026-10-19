'use client';

import { useEffect, useState } from 'react';
import { usePreferences } from '@/components/providers/PreferencesProvider';

interface CornellFields { cues: string; notes: string; summary: string; reflection: string; }
const emptyFields: CornellFields = { cues: '', notes: '', summary: '', reflection: '' };
const inputClass = 'min-h-32 w-full resize-y rounded-2xl border border-slate-700 bg-[#0f1829] p-4 text-sm leading-6 text-slate-200 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-900/40';

export default function CornellNotesPanel({ studySetId }: { studySetId: string }) {
  const { locale, t } = usePreferences();
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
        if (!response.ok) throw new Error(payload.error || t('notes.loadFailed'));
        if (!cancelled) {
          setFields({ cues: payload.cues ?? '', notes: payload.notes ?? '', summary: payload.summary ?? '', reflection: payload.reflection ?? '' });
          setSavedAt(payload.updatedAt ?? '');
        }
      })
      .catch(() => { if (!cancelled) setError(t('notes.loadFailed')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [studySetId, t]);

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
      if (!response.ok) throw new Error(payload.error || t('notes.saveFailed'));
      setSavedAt(payload.updatedAt ?? new Date().toISOString());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('notes.saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="rounded-3xl border border-slate-700 bg-[#0f1829] p-8 text-center text-slate-400">{t('notes.loading')}</div>;
  return <section className="space-y-5">
    <div className="rounded-3xl border border-slate-700 bg-[#0f1829] p-5 sm:p-6">
      <h2 className="text-xl font-black text-slate-100">{t('notes.title')}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-400">{t('notes.help')}</p>
    </div>
    <div className="grid gap-4 md:grid-cols-[0.8fr_1.2fr]">
      <label className="block space-y-2 rounded-3xl border border-slate-700 bg-slate-900 p-4"><span className="text-sm font-extrabold text-slate-100">{t('notes.cues')}</span><textarea maxLength={12000} className={inputClass} value={fields.cues} onChange={(event) => update('cues', event.target.value)} placeholder={t('notes.cuesPlaceholder')} /></label>
      <label className="block space-y-2 rounded-3xl border border-slate-700 bg-[#0f1829] p-4"><span className="text-sm font-extrabold text-slate-100">{t('notes.main')}</span><textarea maxLength={20000} className={inputClass} value={fields.notes} onChange={(event) => update('notes', event.target.value)} placeholder={t('notes.mainPlaceholder')} /></label>
      <label className="block space-y-2 rounded-3xl border border-slate-700 bg-[#0f1829] p-4"><span className="text-sm font-extrabold text-slate-100">{t('notes.summary')}</span><textarea maxLength={8000} className={inputClass} value={fields.summary} onChange={(event) => update('summary', event.target.value)} placeholder={t('notes.summaryPlaceholder')} /></label>
      <label className="block space-y-2 rounded-3xl border border-slate-700 bg-[#0f1829] p-4"><span className="text-sm font-extrabold text-slate-100">{t('notes.reflection')}</span><textarea maxLength={8000} className={inputClass} value={fields.reflection} onChange={(event) => update('reflection', event.target.value)} placeholder={t('notes.reflectionPlaceholder')} /></label>
    </div>
    {error && <p role="alert" className="rounded-xl border border-rose-900 bg-rose-950/50 p-3 text-sm text-rose-200">{error}</p>}
    <div className="flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-slate-500">{savedAt ? t('notes.saved').replace('{date}', new Date(savedAt).toLocaleString(locale === 'id' ? 'id-ID' : 'en-US')) : t('notes.notSaved')}</span><button type="button" disabled={saving} onClick={() => void save()} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-blue-700 disabled:opacity-50">{saving ? t('notes.saving') : t('notes.save')}</button></div>
  </section>;
}
