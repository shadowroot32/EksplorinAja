'use client';

import { useState } from 'react';
import { usePreferences } from '@/components/providers/PreferencesProvider';

export default function ShareDocumentButton({ studySetId }: { studySetId: string }) {
  const { t } = usePreferences();
  const [url, setUrl] = useState('');
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [loading, setLoading] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [message, setMessage] = useState('');

  async function createLink() {
    setLoading(true); setMessage('');
    try {
      const response = await fetch(`/api/study-sets/${studySetId}/share`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiresInDays }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || t('share.create'));
      setUrl(payload.url);
      setMessage(t('share.created'));
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : t('share.create')); }
    finally { setLoading(false); }
  }

  async function revokeLinks() {
    setRevoking(true); setMessage('');
    try {
      const response = await fetch(`/api/study-sets/${studySetId}/share`, { method: 'DELETE' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || t('share.revoke'));
      setUrl('');
      setMessage(t('share.revoked'));
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : t('share.revoke')); }
    finally { setRevoking(false); }
  }

  async function copyLink() {
    try { await navigator.clipboard.writeText(url); setMessage(t('share.copied')); }
    catch { setMessage(t('share.copyFailed')); }
  }

  return <section className="rounded-2xl border border-slate-700 bg-[#0f1829] p-4 sm:p-5">
    <h2 className="font-extrabold text-slate-100">{t('share.title')}</h2>
    <p className="mt-1 text-xs leading-5 text-slate-400">{t('share.help')}</p>
    <div className="mt-3 flex flex-wrap gap-2">
      <label className="flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-300">{t('share.expires')}
        <select value={expiresInDays} onChange={(event) => setExpiresInDays(Number(event.target.value))} className="rounded-lg bg-slate-800 py-1 font-bold text-slate-100"><option value={1}>1 {t('share.day')}</option><option value={7}>7 {t('share.days')}</option><option value={30}>30 {t('share.days')}</option></select>
      </label>
      <button type="button" disabled={loading} onClick={() => void createLink()} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-500 disabled:opacity-50">{loading ? t('share.creating') : t('share.create')}</button>
      <button type="button" disabled={revoking} onClick={() => void revokeLinks()} className="rounded-xl border border-rose-900 px-4 py-2.5 text-sm font-bold text-rose-300 hover:bg-rose-950/50 disabled:opacity-50">{revoking ? t('share.revoking') : t('share.revoke')}</button>
    </div>
    {url && <div className="mt-3 flex flex-col gap-2 sm:flex-row"><input readOnly value={url} aria-label="Share URL" className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-300" /><button type="button" onClick={() => void copyLink()} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-300 hover:bg-slate-50">{t('share.copy')}</button></div>}
    {message && <p role="status" className="mt-3 text-xs leading-5 text-slate-400">{message}</p>}
  </section>;
}
