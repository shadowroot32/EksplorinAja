'use client';

import { useEffect, useState } from 'react';

interface PodcastData { id: string; script: string; audioUrl: string | null; createdAt: string; }

export default function PodcastPanel({ studySetId }: { studySetId: string }) {
  const [podcast, setPodcast] = useState<PodcastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/study-sets/${studySetId}/podcast`)
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error || 'Podcast could not be loaded');
        if (!cancelled) setPodcast(payload);
      })
      .catch(() => { if (!cancelled) setError('Podcast could not be loaded. Refresh and try again.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => {
      cancelled = true;
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, [studySetId]);

  async function generate() {
    setGenerating(true); setError('');
    try {
      const response = await fetch(`/api/study-sets/${studySetId}/podcast`, { method: 'POST' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Podcast could not be generated');
      setPodcast(payload as PodcastData);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Podcast could not be generated');
    } finally { setGenerating(false); }
  }

  function toggleSpeech() {
    if (!podcast?.script || !('speechSynthesis' in window)) {
      setError('Browser ini belum mendukung pembacaan naskah.');
      return;
    }
    if (playing) {
      window.speechSynthesis.cancel(); setPlaying(false); return;
    }
    const utterance = new SpeechSynthesisUtterance(podcast.script);
    utterance.lang = 'id-ID';
    utterance.onend = () => setPlaying(false);
    utterance.onerror = () => setPlaying(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setPlaying(true);
  }

  return <section className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-700 bg-[#0f1829] p-5 sm:p-6">
      <div><p className="text-xs font-extrabold uppercase tracking-[0.2em] text-violet-300">Listen & learn</p><h2 className="mt-2 text-xl font-black text-slate-100">AI Study Podcast</h2><p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">Ubah materi menjadi naskah percakapan edukatif dan dengarkan melalui fitur suara browser.</p></div>
      <button type="button" onClick={() => void generate()} disabled={generating} className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-violet-700 disabled:opacity-50">{generating ? 'Generating…' : podcast ? 'Regenerate script' : 'Generate podcast'}</button>
    </div>
    {error && <p role="alert" className="rounded-xl border border-rose-900 bg-rose-950/50 p-3 text-sm text-rose-200">{error}</p>}
    {loading ? <p className="rounded-2xl border border-slate-700 bg-[#0f1829] p-8 text-center text-sm text-slate-500">Loading podcast…</p>
      : !podcast ? <p className="rounded-3xl border border-dashed border-slate-700 bg-[#0f1829] p-10 text-center text-sm leading-6 text-slate-500">Belum ada naskah podcast. Pilih Generate podcast untuk membuatnya dari materi ini.</p>
      : <article className="space-y-4 rounded-3xl border border-slate-700 bg-[#0f1829] p-5 shadow-sm sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-extrabold text-slate-100">Episode script</h3><p className="mt-1 text-xs text-slate-500">Dibuat {new Date(podcast.createdAt).toLocaleString()}</p></div><button type="button" onClick={toggleSpeech} className="rounded-xl border border-violet-200 px-4 py-2.5 text-sm font-bold text-violet-300 hover:bg-violet-50">{playing ? 'Stop narration' : '▶ Play narration'}</button></div>
        <p className="whitespace-pre-wrap text-sm leading-7 text-slate-300">{podcast.script}</p>
        <p className="text-xs text-slate-500">Suara menggunakan text-to-speech browser; file audio MP3 belum dibuat atau disimpan di server.</p>
      </article>}
  </section>;
}
