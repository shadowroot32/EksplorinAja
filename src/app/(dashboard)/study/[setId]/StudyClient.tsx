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

  if (!set) return <div className="text-slate-600 text-center py-20">Loading…</div>;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'summary', label: '📄 Summary' },
    { key: 'flashcards', label: '🧠 Flashcards' },
    { key: 'quiz', label: '📝 Quiz' },
    { key: 'chat', label: '💬 Chat' },
  ];

  const tabCls = (k: Tab) =>
    `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
      tab === k ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
    }`;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{set.title}</h1>
        <p className="text-slate-600 text-sm mt-1">Source: {set.sourceType}</p>
      </div>
      <div className="flex gap-1 bg-white border border-slate-200 p-1 rounded-xl flex-wrap">
        {tabs.map(t => <button key={t.key} onClick={() => setTab(t.key)} className={tabCls(t.key)}>{t.label}</button>)}
      </div>
      {tab === 'summary' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Summary</h2>
          <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{set.summary || 'No summary available.'}</p>
        </div>
      )}
      {tab === 'flashcards' && <FlashcardViewer studySetId={setId} />}
      {tab === 'quiz' && <QuizPlayer studySetId={setId} />}
      {tab === 'chat' && <ChatInterface studySetId={setId} />}
    </div>
  );
}
