'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { usePreferences } from '@/components/providers/PreferencesProvider';

interface QuizItem { id: string; question: string; options: string[]; }
interface QuizResults {
  score: number;
  total: number;
  percentage: number;
  results: Array<{ questionId: string; selectedIndex: number; correctIndex: number; explanation: string; isCorrect: boolean }>;
}

export default function QuizPlayer({ studySetId }: { studySetId: string }) {
  const { locale, t } = usePreferences();
  const [items, setItems] = useState<QuizItem[]>([]);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [results, setResults] = useState<QuizResults | null>(null);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [restored, setRestored] = useState(false);
  const [resumed, setResumed] = useState(false);
  const storageKey = 'eksplorinaja:quiz-progress:' + studySetId;

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/study-sets/${studySetId}/quiz`)
      .then(async (response) => {
        if (!response.ok) throw new Error(t('quiz.failed'));
        const payload = await response.json();
        if (cancelled) return;
        const quizItems = Array.isArray(payload) ? payload as QuizItem[] : [];
        setItems(quizItems);
        try {
          const saved = window.sessionStorage.getItem(storageKey);
          if (saved) {
            const parsed = JSON.parse(saved) as { idx?: unknown; answers?: unknown };
            const validIds = new Set(quizItems.map((item) => item.id));
            const restoredAnswers: Record<string, number> = {};
            if (parsed.answers && typeof parsed.answers === 'object' && !Array.isArray(parsed.answers)) {
              for (const [questionId, selectedIndex] of Object.entries(parsed.answers)) {
                const item = quizItems.find((candidate) => candidate.id === questionId);
                if (item && typeof selectedIndex === 'number' && Number.isInteger(selectedIndex) &&
                    selectedIndex >= 0 && selectedIndex < item.options.length) {
                  restoredAnswers[questionId] = selectedIndex;
                }
              }
            }
            const savedIndex = typeof parsed.idx === 'number' && Number.isInteger(parsed.idx) ? parsed.idx : 0;
            const safeIndex = Math.max(0, Math.min(savedIndex, Math.max(0, quizItems.length - 1)));
            setAnswers(restoredAnswers);
            setIdx(safeIndex);
            setResumed(safeIndex > 0 || Object.keys(restoredAnswers).length > 0);
            setSelected(quizItems[safeIndex] && validIds.has(quizItems[safeIndex].id)
              ? restoredAnswers[quizItems[safeIndex].id] ?? null
              : null);
          }
        } catch {
          try { window.sessionStorage.removeItem(storageKey); } catch { /* Storage may be unavailable. */ }
        }
        setRestored(true);
      })
      .catch(() => { if (!cancelled) { setLoadError(t('quiz.failed')); setRestored(true); } });
    return () => { cancelled = true; };
  }, [studySetId, t]);

  useEffect(() => {
    if (!restored || items.length === 0) return;
    try {
      if (done) {
        window.sessionStorage.removeItem(storageKey);
      } else {
        window.sessionStorage.setItem(storageKey, JSON.stringify({ idx, answers }));
      }
    } catch {
      // The quiz remains usable if session storage is disabled or full.
    }
  }, [answers, done, idx, items.length, restored, storageKey]);

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
      if (!response.ok) throw new Error(payload.error || t('quiz.savedFailed'));
      setResults(payload as QuizResults);
      setDone(true);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : t('quiz.savedFailed'));
    } finally {
      setSaving(false);
    }
  }

  if (loadError) return <p role="alert" className="rounded-xl border border-rose-900 bg-rose-950/50 p-4 text-sm text-rose-200">{loadError}</p>;
  if (items.length === 0) return <div className="py-20 text-center text-slate-400">{t('quiz.empty')}</div>;

  if (done && results) return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-slate-700 bg-[#0f1829] p-8 text-center shadow-sm">
        <div className="text-5xl" aria-hidden="true">{results.percentage >= 70 ? '🏆' : '📚'}</div>
        <h2 className="mt-3 text-xl font-black text-slate-100">{t('quiz.complete')}</h2>
        <p className="mt-2 text-slate-400">{results.score} / {results.total} {t('quiz.correct')} ({results.percentage}%)</p>
        <p className="mt-2 text-sm text-slate-400">Your subject mastery has been updated from this result.</p>
        <Button className="mt-5" onClick={() => { setIdx(0); setSelected(null); setAnswers({}); setResults(null); setDone(false); setResumed(false); setSaveError(''); }}>{t('quiz.retry')}</Button>
      </div>
      <div className="space-y-3">
        {results.results.map((result, resultIndex) => {
          const question = items.find((item) => item.id === result.questionId);
          if (!question) return null;
          return <article key={result.questionId} className="rounded-2xl border border-slate-700 bg-[#0f1829] p-5">
            <p className="font-bold text-slate-100">{resultIndex + 1}. {question.question}</p>
            <p className={'mt-3 text-sm ' + (result.isCorrect ? 'text-emerald-700' : 'text-rose-700')}>{t('quiz.yourAnswer')}: {question.options[result.selectedIndex]}</p>
            {!result.isCorrect && <p className="mt-1 text-sm font-semibold text-slate-300">{t('quiz.correctAnswer')}: {question.options[result.correctIndex]}</p>}
            <p className="mt-2 text-sm leading-6 text-slate-400">{result.explanation}</p>
          </article>;
        })}
      </div>
    </div>
  );

  const question = items[idx];

  return (
    <div className="space-y-6">
      {resumed && <p role="status" className="rounded-xl border border-sky-900 bg-sky-950/40 p-3 text-sm text-sky-200">{locale === 'id' ? 'Progres kuis sebelumnya dipulihkan untuk tab ini.' : 'Your previous quiz progress was restored for this tab.'}</p>}
      <div className="flex justify-between text-sm text-slate-400">
        <span>{t('quiz.questionOf').replace('{i}', String(idx + 1)).replace('{n}', String(items.length))}</span>
        <span>{Object.keys(answers).length} {t('quiz.answered')}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: ((idx / items.length) * 100) + '%' }} />
      </div>
      <div className="rounded-xl border border-slate-700 bg-[#0f1829] p-6">
        <p className="text-lg font-medium leading-relaxed text-slate-100">{question.question}</p>
      </div>
      <div className="space-y-3">
        {question.options.map((option, optionIndex) => {
          const selectedOption = selected === optionIndex;
          const className = 'w-full rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-900/50 ' +
            (selectedOption ? 'border-blue-500 bg-blue-950/60 text-blue-100' : 'border-slate-300 text-slate-300 hover:border-blue-400 hover:bg-slate-50');
          return <button key={optionIndex} type="button" disabled={selected !== null || saving} aria-pressed={selectedOption} className={className} onClick={() => pick(optionIndex)}>{String.fromCharCode(65 + optionIndex)}. {option}</button>;
        })}
      </div>
      {saveError && <p role="alert" className="rounded-xl border border-rose-900 bg-rose-950/50 p-3 text-sm text-rose-200">{saveError}</p>}
      {selected !== null && <Button onClick={next} disabled={saving} className="w-full">{saving ? t('quiz.saving') : idx + 1 < items.length ? t('quiz.next') : t('quiz.submit')}</Button>}
    </div>
  );
}
