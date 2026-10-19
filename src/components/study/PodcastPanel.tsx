'use client';

import { useEffect, useState } from 'react';
import { usePreferences } from '@/components/providers/PreferencesProvider';

interface PodcastData { id: string; script: string; audioUrl: string | null; createdAt: string; }

export default function PodcastPanel({ studySetId }: { studySetId: string }) {
  const { locale, t } = usePreferences();
  const [podcast, setPodcast] = useState<PodcastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [mediaKind, setMediaKind] = useState<'audio' | 'video' | null>(null);
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'audio' | 'video' | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/study-sets/${studySetId}/podcast`)
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error || t('podcast.loadFailed'));
        if (!cancelled) setPodcast(payload);
      })
      .catch(() => { if (!cancelled) setError(t('podcast.loadFailed')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => {
      cancelled = true;
      if (mediaUrl) URL.revokeObjectURL(mediaUrl);
    };
  // mediaUrl intentionally isn't a dependency: cleanup should run when the panel unmounts.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studySetId, t]);

  async function generate() {
    setGenerating(true); setError('');
    try {
      const response = await fetch(`/api/study-sets/${studySetId}/podcast`, { method: 'POST' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || t('podcast.loadFailed'));
      setPodcast(payload as PodcastData);
      setMediaType(null);
      if (mediaUrl) URL.revokeObjectURL(mediaUrl);
      setMediaUrl('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('podcast.loadFailed'));
    } finally { setGenerating(false); }
  }

  async function generateMedia(kind: 'audio' | 'video') {
    setMediaKind(kind);
    setError('');
    try {
      const response = await fetch(`/api/study-sets/${studySetId}/podcast/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || (locale === 'id' ? 'Gagal membuat file media.' : 'Could not generate media file.'));
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      if (mediaUrl) URL.revokeObjectURL(mediaUrl);
      setMediaUrl(url);
      setMediaType(kind);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : (locale === 'id' ? 'Gagal membuat file media.' : 'Could not generate media file.'));
    } finally { setMediaKind(null); }
  }

  return <section className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-700 bg-[#0f1829] p-5 sm:p-6">
      <div><p className="text-xs font-extrabold uppercase tracking-[0.2em] text-violet-300">{t('podcast.listen')}</p><h2 className="mt-2 text-xl font-black text-slate-100">{t('podcast.title')}</h2><p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">{t('podcast.help')}</p></div>
      <button type="button" onClick={() => void generate()} disabled={generating || mediaKind !== null} className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-violet-700 disabled:opacity-50">{generating ? t('podcast.generating') : podcast ? t('podcast.regenerate') : t('podcast.generate')}</button>
    </div>
    {error && <p role="alert" className="rounded-xl border border-rose-900 bg-rose-950/50 p-3 text-sm text-rose-200">{error}</p>}
    {loading ? <p className="rounded-2xl border border-slate-700 bg-[#0f1829] p-8 text-center text-sm text-slate-500">{t('podcast.loading')}</p>
      : !podcast ? <p className="rounded-3xl border border-dashed border-slate-700 bg-[#0f1829] p-10 text-center text-sm leading-6 text-slate-500">{t('podcast.empty')}</p>
      : <article className="space-y-4 rounded-3xl border border-slate-700 bg-[#0f1829] p-5 shadow-sm sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-extrabold text-slate-100">{t('podcast.script')}</h3><p className="mt-1 text-xs text-slate-500">{locale === 'id' ? 'Dibuat ' : 'Created '}{new Date(podcast.createdAt).toLocaleString(locale === 'id' ? 'id-ID' : 'en-US')}</p></div>
          <button type="button" onClick={() => {
            const blob = new Blob([podcast.script], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a'); link.href = url; link.download = 'eksplorinaja-podcast.txt'; link.click();
            URL.revokeObjectURL(url);
          }} className="rounded-xl border border-slate-600 px-3 py-2 text-sm font-bold text-slate-200 hover:bg-slate-800">{locale === 'id' ? 'Unduh naskah TXT' : 'Download TXT script'}</button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void generateMedia('audio')} disabled={mediaKind !== null || generating} className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-50">{mediaKind === 'audio' ? (locale === 'id' ? 'Membuat MP3…' : 'Generating MP3…') : (locale === 'id' ? 'Buat audio MP3' : 'Generate MP3 audio')}</button>
          <button type="button" onClick={() => void generateMedia('video')} disabled={mediaKind !== null || generating} className="rounded-xl border border-violet-400 px-4 py-2.5 text-sm font-bold text-violet-200 hover:bg-violet-950 disabled:opacity-50">{mediaKind === 'video' ? (locale === 'id' ? 'Merender MP4…' : 'Rendering MP4…') : (locale === 'id' ? 'Buat video MP4' : 'Generate MP4 video')}</button>
        </div>
        {mediaUrl && mediaType === 'audio' && <div className="space-y-3 rounded-xl border border-slate-700 p-3"><audio controls src={mediaUrl} className="w-full">{locale === 'id' ? 'Browser tidak mendukung audio.' : 'Your browser does not support audio.'}</audio><a href={mediaUrl} download="eksplorinaja-podcast.mp3" className="inline-flex rounded-lg bg-slate-700 px-3 py-2 text-sm font-bold text-white">{locale === 'id' ? 'Unduh MP3' : 'Download MP3'}</a></div>}
        {mediaUrl && mediaType === 'video' && <div className="space-y-3 rounded-xl border border-slate-700 p-3"><video controls src={mediaUrl} className="w-full rounded-lg" /> <a href={mediaUrl} download="eksplorinaja-study.mp4" className="inline-flex rounded-lg bg-slate-700 px-3 py-2 text-sm font-bold text-white">{locale === 'id' ? 'Unduh MP4' : 'Download MP4'}</a></div>}
        <p className="whitespace-pre-wrap text-sm leading-7 text-slate-300">{podcast.script}</p>
        <p className="text-xs text-slate-500">{locale === 'id' ? 'MP3/MP4 dibuat oleh worker mandiri jika sudah dikonfigurasi. Pemrosesan dapat memerlukan waktu dan CPU.' : 'MP3/MP4 are generated by the self-hosted worker when configured. Processing may take time and CPU.'}</p>
      </article>}
  </section>;
}
