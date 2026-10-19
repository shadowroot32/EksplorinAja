'use client';

import { useState } from 'react';
import { usePreferences } from '@/components/providers/PreferencesProvider';

interface MindMapNode { id: string; label: string; parentId: string | null; }
interface MindMapData { title: string; nodes: MindMapNode[]; }

export default function MindMapPanel({ studySetId }: { studySetId: string }) {
  const { locale, t } = usePreferences();
  const [mapData, setMapData] = useState<MindMapData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function generate() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/study-sets/${studySetId}/mind-map`, { method: 'POST' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || t('mind.failed'));
      if (!payload || typeof payload.title !== 'string' || !Array.isArray(payload.nodes)) {
        throw new Error(t('mind.failed'));
      }
      setMapData({
        title: payload.title,
        nodes: payload.nodes.filter((node: unknown): node is MindMapNode =>
          typeof node === 'object' && node !== null &&
          typeof (node as MindMapNode).id === 'string' &&
          typeof (node as MindMapNode).label === 'string' &&
          ((node as MindMapNode).parentId === null || typeof (node as MindMapNode).parentId === 'string')
        ),
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('mind.failed'));
    } finally {
      setLoading(false);
    }
  }

  function updateLabel(id: string, label: string) {
    setMapData((current) => current ? {
      ...current,
      nodes: current.nodes.map((node) => node.id === id ? { ...node, label } : node),
    } : current);
  }

  function addNode(parentId: string | null) {
    setMapData((current) => current ? {
      ...current,
      nodes: [...current.nodes, {
        id: crypto.randomUUID(),
        label: locale === 'id' ? 'Konsep baru' : 'New concept',
        parentId,
      }],
    } : current);
  }

  function removeNodeBranch(id: string) {
    setMapData((current) => {
      if (!current) return current;
      const removed = new Set([id]);
      let changed = true;
      while (changed) {
        changed = false;
        for (const node of current.nodes) {
          if (node.parentId && removed.has(node.parentId) && !removed.has(node.id)) {
            removed.add(node.id);
            changed = true;
          }
        }
      }
      return { ...current, nodes: current.nodes.filter((node) => !removed.has(node.id)) };
    });
  }

  function exportMap() {
    if (!mapData) return;
    const blob = new Blob([JSON.stringify(mapData, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'eksplorinaja-mind-map.json';
    link.click();
    URL.revokeObjectURL(url);
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
      <div className={'rounded-2xl border px-3 py-3 shadow-sm ' + (depth === 0 ? 'border-blue-300 bg-blue-600' : depth === 1 ? 'border-sky-900 bg-slate-900' : 'border-slate-700 bg-slate-900')}>
        <label className="sr-only" htmlFor={'mind-node-' + node.id}>{locale === 'id' ? 'Edit label node peta pikiran' : 'Edit mind map node label'}</label>
        <input id={'mind-node-' + node.id} value={node.label} maxLength={500} onChange={(event) => updateLabel(node.id, event.target.value)} className={'w-full min-w-0 rounded-lg bg-transparent px-1 py-1 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ' + (depth === 0 ? 'text-white placeholder:text-blue-100' : depth === 1 ? 'text-sky-100 placeholder:text-slate-500' : 'text-slate-300 placeholder:text-slate-500')} />
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" onClick={() => addNode(node.id)} className="rounded-lg border border-slate-600/80 px-2.5 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400">{locale === 'id' ? '+ Subkonsep' : '+ Child'}</button>
          <button type="button" onClick={() => removeNodeBranch(node.id)} className="rounded-lg border border-rose-900/80 px-2.5 py-1.5 text-xs font-bold text-rose-200 hover:bg-rose-950/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400">{locale === 'id' ? 'Hapus cabang' : 'Remove branch'}</button>
        </div>
      </div>
      {children.length > 0 && <ul className="ml-4 mt-3 space-y-3 border-l-2 border-slate-700 pl-4 sm:ml-6 sm:pl-5">{children.map((child) => renderNode(child, depth + 1))}</ul>}
    </li>;
  }

  return <section className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-700 bg-[#0f1829] p-5 sm:p-6">
      <div><h2 className="text-xl font-black text-slate-100">{t('mind.title')}</h2><p className="mt-2 text-sm text-slate-400">{t('mind.help')}</p></div>
      <button type="button" onClick={() => void generate()} disabled={loading} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-blue-700 disabled:opacity-50">{loading ? t('mind.generating') : mapData ? t('mind.regenerate') : t('mind.generate')}</button>
    </div>
    {error && <p role="alert" className="rounded-xl border border-rose-900 bg-rose-950/50 p-3 text-sm text-rose-200">{error}</p>}
    {!mapData && !loading && <div className="rounded-3xl border border-dashed border-slate-700 bg-[#0f1829] p-10 text-center text-sm leading-6 text-slate-400">{t('mind.empty')}</div>}
    {loading && <div role="status" className="rounded-3xl border border-slate-700 bg-[#0f1829] p-10 text-center text-sm text-slate-400">{t('mind.wait')}</div>}
    {mapData && <div className="space-y-4 rounded-3xl border border-slate-700 bg-[#0f1829] p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="min-w-0 flex-1 text-sm font-semibold text-slate-300">Map title
          <input value={mapData.title} maxLength={200} onChange={(event) => setMapData((current) => current ? { ...current, title: event.target.value } : current)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-base font-black text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500" />
        </label>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => addNode(null)} className="rounded-xl border border-slate-600 px-4 py-2.5 text-sm font-bold text-slate-100 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500">{locale === 'id' ? 'Tambah konsep utama' : 'Add root concept'}</button>
          <button type="button" onClick={exportMap} className="rounded-xl border border-slate-600 px-4 py-2.5 text-sm font-bold text-slate-100 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500">Export JSON</button>
        </div>
      </div>
      <p className="text-xs text-slate-500">Edit labels, add concepts or remove branches, then export the map as JSON. Edits stay in this session until you export them.</p>
      <ul className="min-w-64 space-y-3">{(childrenByParent.get(null) ?? []).map((root) => renderNode(root, 0))}</ul>
      {mapData.nodes.length === 0 && <p className="text-sm text-slate-400">This map has no valid nodes. Try generating it again.</p>}
    </div>}
  </section>;
}
