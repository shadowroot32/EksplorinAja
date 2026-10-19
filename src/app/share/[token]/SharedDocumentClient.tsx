'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';

interface SharedDocument { title: string; sourceType: string; sourceContent: string; summary: string; createdAt: string; expiresAt: string; }

export default function SharedDocumentClient({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [document, setDocument] = useState<SharedDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/share/' + encodeURIComponent(token))
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) { if (!cancelled) setNotFound(true); return; }
        if (!cancelled) setDocument(payload.document ?? null);
      })
      .catch(() => { if (!cancelled) setNotFound(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token]);

  return <main className="min-h-screen bg-sky-50 px-4 py-10 sm:px-6">
    <div className="mx-auto max-w-4xl space-y-5">
      <header className="flex items-center justify-between gap-3"><Link href="/" className="font-black tracking-tight text-slate-950">Explorin.ai</Link><span className="rounded-full border border-blue-100 bg-white px-3 py-1 text-xs font-bold text-blue-700">Shared study material</span></header>
      {loading ? <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-500">Loading shared material…</div>
        : notFound || !document ? <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center"><h1 className="text-xl font-black text-slate-950">Link not found or expired</h1><p className="mt-2 text-sm text-slate-600">The owner may have revoked the link or its expiration date has passed.</p></div>
        : <article className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
          <div><p className="text-xs font-extrabold uppercase tracking-[0.2em] text-blue-600">Read-only document</p><h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">{document.title}</h1><p className="mt-2 text-sm text-slate-500">{document.sourceType.toUpperCase()} · Link expires {new Date(document.expiresAt).toLocaleString()}</p></div>
          <section><h2 className="mb-3 text-lg font-extrabold text-slate-900">Summary</h2><p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{document.summary || 'No summary available.'}</p></section>
          <section><h2 className="mb-3 text-lg font-extrabold text-slate-900">Source material</h2><p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-600">{document.sourceContent || 'No source text available.'}</p></section>
          <p className="border-t border-slate-100 pt-4 text-xs text-slate-400">Anyone with this link can read the shared material. Please treat it as public.</p>
        </article>}
    </div>
  </main>;
}
