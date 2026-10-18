'use client';

import { useState } from 'react';

interface MindMapNode { id: string; label: string; parentId: string | null; }
interface MindMapData { title: string; nodes: MindMapNode[]; }

export default function MindMapPanel({ studySetId }: { studySetId: string }) {
  const [mapData, setMapData] = useState<MindMapData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function generate() {
    setLoading(true); setError('');
    try {
      const response = await fetch(`/api/study-sets/${studySetId}/mind-map`, { method: 'POST' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Mind map could not be generated');
      setMapData(payload as MindMapData);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Mind map could not be generated');
    } finally { setLoading(false); }
  }

  const childrenByParent = new Map<string | null, MindMapNode[]>();
  for (const node of mapData?.nodes ?? []) {
    const children = childrenByParent.get(node.parentId) ?? [];
    children.push(node);
    childrenByParent.set(node.parentId, children);
  }

  function renderNode(node: MindMapNode, depth: number): React.ReactNode {
    const children = childrenByParent.get(node.id) ?? [];
    return <li key={node.id} className="min-w-0">
      <div className={'rounded-2xl border px-4 py-3 text-sm font-semibold shadow-sm ' + (depth === 0 ? 'border-blue-300 bg-blue-600 text-white' : depth === 1 ? 'border-sky-200 bg-sky-50 text-slate-900' : 'border-slate-200 bg-white text-slate-700')}>{node.label}</div>
      {children.length > 0 && <ul className="ml-4 mt-3 space-y-3 border-l-2 border-sky-100 pl-4 sm:ml-6 sm:pl-5">{children.map((child) => renderNode(child, depth + 1))}</ul>}
    </li>;
  }

  return <section className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-sky-100 bg-gradient-to-br from-sky-50 to-white p-5 sm:p-6">
      <div><h2 className="text-xl font-black text-slate-950">Mind map</h2><p className="mt-2 text-sm text-slate-600">Buat peta konsep hierarkis dari materi dengan AI.</p></div>
      <button type="button" onClick={() => void generate()} disabled={loading} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-blue-700 disabled:opacity-50">{loading ? 'Generating…' : mapData ? 'Regenerate mind map' : 'Generate mind map'}</button>
    </div>
    {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    {!mapData && !loading && <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm leading-6 text-slate-500">Mind map akan tampil di sini. Peta dibuat dari ringkasan atau materi sumber.</div>}
    {loading && <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">AI sedang menyusun hubungan antar-konsep…</div>}
    {mapData && <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white p-5 sm:p-7"><h3 className="mb-5 text-center text-lg font-black text-slate-950">{mapData.title}</h3><ul className="min-w-64 space-y-3">{(childrenByParent.get(null) ?? []).map((root) => renderNode(root, 0))}</ul></div>}
  </section>;
}
