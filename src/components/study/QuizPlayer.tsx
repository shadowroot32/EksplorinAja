'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

interface QuizItem { id: string; question: string; options: string[]; }
interface QuizResults {
  score: number;
  total: number;
  percentage: number;
  results: Array<{ questionId: string; selectedIndex: number; correctIndex: number; explanation: string; isCorrect: boolean }>;
}

export default function QuizPlayer({ studySetId }: { studySetId: string }) {
  const [items, setItems] = useState<QuizItem[]>([]);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [results, setResults] = useState<QuizResults | null>(null);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/study-sets/${studySetId}/quiz`)
      .then(async (response) => {
        if (!response.ok) throw new Error('Could not load quiz');
        const payload = await response.json();
        if (!cancelled) setItems(Array.isArray(payload) ? payload : []);
      })
      .catch(() => { if (!cancelled) setLoadError('Quiz could not be loaded. Refresh the page to try again.'); });
    return () => { cancelled = true; };
  }, [studySetId]);

  function pick(index: number) {
    if (selected !== null) return;
    setSelected(index);
    setAnswers((current) => ({ ...current, [items[idx].id]: index }));
  }

  async function next() {
    if (selected === null || saving) return;
    if (idx + 1 < items.length) {
      setIdx((current) => current + 1);
      setSelected(null);
      return;
    }

    setSaving(true);
    setSaveError('');
    try {
      const response = await fetch(`/api/study-sets/${studySetId}/quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: items.map((item) => ({ questionId: item.id, selectedIndex: answers[item.id] })),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Quiz results could not be saved.');
      setResults(payload as QuizResults);
      setDone(true);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Quiz results could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  if (loadError) return <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{loadError}</p>;
  if (items.length === 0) return <div className="py-20 text-center text-slate-600">No quiz questions yet.</div>;

  if (done && results) return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="text-5xl" aria-hidden="true">{results.percentage >= 70 ? '🏆' : '📚'}</div>
        <h2 className="mt-3 text-xl font-black text-slate-950">Quiz complete!</h2>
        <p className="mt-2 text-slate-600">{results.score} / {results.total} correct ({results.percentage}%)</p>
        <p className="mt-2 text-sm text-slate-500">Your subject mastery has been updated from this result.</p>
        <Button className="mt-5" onClick={() => { setIdx(0); setSelected(null); setAnswers({}); setResults(null); setDone(false); setSaveError(''); }}>Retry quiz</Button>
      </div>
      <div className="space-y-3">
        {results.results.map((result, resultIndex) => {
          const question = items.find((item) => item.id === result.questionId);
          if (!question) return null;
          return <article key={result.questionId} className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="font-bold text-slate-900">{resultIndex + 1}. {question.question}</p>
            <p className={'mt-3 text-sm ' + (result.isCorrect ? 'text-emerald-700' : 'text-rose-700')}>Your answer: {question.options[result.selectedIndex]}</p>
            {!result.isCorrect && <p className="mt-1 text-sm font-semibold text-slate-700">Correct answer: {question.options[result.correctIndex]}</p>}
            <p className="mt-2 text-sm leading-6 text-slate-600">{result.explanation}</p>
          </article>;
        })}
      </div>
    </div>
  );

  const question = items[idx];

  return (
    <div className="space-y-6">
      <div className="flex justify-between text-sm text-slate-600">
        <span>Question {idx + 1} of {items.length}</span>
        <span>{Object.keys(answers).length} answered</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: ((idx / items.length) * 100) + '%' }} />
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <p className="text-lg font-medium leading-relaxed text-slate-900">{question.question}</p>
      </div>
      <div className="space-y-3">
        {question.options.map((option, optionIndex) => {
          const selectedOption = selected === optionIndex;
          const className = 'w-full rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 ' +
            (selectedOption ? 'border-blue-500 bg-blue-50 text-blue-900' : 'border-slate-300 text-slate-700 hover:border-blue-400 hover:bg-slate-50');
          return <button key={optionIndex} type="button" disabled={selected !== null || saving} aria-pressed={selectedOption} className={className} onClick={() => pick(optionIndex)}>{String.fromCharCode(65 + optionIndex)}. {option}</button>;
        })}
      </div>
      {saveError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{saveError}</p>}
      {selected !== null && <Button onClick={next} disabled={saving} className="w-full">{saving ? 'Saving results…' : idx + 1 < items.length ? 'Next question →' : 'Submit answers'}</Button>}
    </div>
  );
}
