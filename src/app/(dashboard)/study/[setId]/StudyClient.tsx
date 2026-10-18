'use client';
import { useEffect, useState } from 'react';
import { use } from 'react';
import FlashcardViewer from '@/components/study/FlashcardViewer';
import QuizPlayer from '@/components/study/QuizPlayer';
import ChatInterface from '@/components/study/ChatInterface';

type Tab = 'summary' | 'flashcards' | 'quiz' | 'chat';
interface StudySet { id: string; title: string; summary: string; sourceType: string; }

export default function StudyClient({ paramsPromise }: { paramsPromise: Promise<{ setId: string }> }) {
  const { setId } = use(paramsPromise);
  const [set, setSet] = useState<StudySet | null>(null);
  const [tab, setTab] = useState<Tab>('summary');

  useEffect(() => {
    fetch(`/api/study-sets/${setId}`).then(r => r.json()).then(setSet);
  }, [setId]);

  if (!set) return <div className="text-slate-400 text-center py-20">Loading…</div>;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'summary', label: '📄 Summary' },
    { key: 'flashcards', label: '🧠 Flashcards' },
    { key: 'quiz', label: '📝 Quiz' },
    { key: 'chat', label: '💬 Chat' },
  ];

  const tabCls = (k: Tab) =>
    `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
      tab === k ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
    }`;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">{set.title}</h1>
        <p className="text-slate-400 text-sm mt-1">Source: {set.sourceType}</p>
      </div>
      <div className="flex gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl flex-wrap">
        {tabs.map(t => <button key={t.key} onClick={() => setTab(t.key)} className={tabCls(t.key)}>{t.label}</button>)}
      </div>
      {tab === 'summary' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-slate-100 mb-4">Summary</h2>
          <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{set.summary || 'No summary available.'}</p>
        </div>
      )}
      {tab === 'flashcards' && <FlashcardViewer studySetId={setId} />}
      {tab === 'quiz' && <QuizPlayer studySetId={setId} />}
      {tab === 'chat' && <ChatInterface studySetId={setId} />}
    </div>
  );
}
