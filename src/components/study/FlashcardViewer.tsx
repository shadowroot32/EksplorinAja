'use client';

import { useEffect, useState } from 'react';
import { usePreferences } from '@/components/providers/PreferencesProvider';

interface Flashcard {
  id: string;
  front: string;
  back: string;
  interval: number;
  easeFactor: number;
  repetitions: number;
  dueDate: string;
}
type Grade = 1 | 3 | 4 | 5;

const gradeOptions: { grade: Grade; labelKey: string; className: string }[] = [
  { grade: 1, labelKey: 'flash.again', className: 'border-rose-900 text-rose-200 hover:bg-rose-950/60' },
  { grade: 3, labelKey: 'flash.hard', className: 'border-amber-900 text-amber-200 hover:bg-amber-950/50' },
  { grade: 4, labelKey: 'flash.good', className: 'border-emerald-900 text-emerald-200 hover:bg-emerald-950/50' },
  { grade: 5, labelKey: 'flash.easy', className: 'border-sky-900 text-sky-200 hover:bg-sky-950/50' },
];

export default function FlashcardViewer({ studySetId, tags = [] }: { studySetId: string; tags?: string[] }) {
  const { t } = usePreferences();
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/study-sets/' + studySetId + '/flashcards', { cache: 'no-store' })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error || t('flash.loadFailed'));
        if (!cancelled) setCards(Array.isArray(payload) ? payload : []);
      })
      .catch(() => { if (!cancelled) setError(t('flash.loadFailed')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [studySetId, t]);

  function toggleReveal(id: string) {
    setRevealedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function grade(card: Flashcard, value: Grade) {
    if (savingId) return;
    setSavingId(card.id);
    setError('');
    try {
      const response = await fetch('/api/study-sets/' + studySetId + '/flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId: card.id, grade: value }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || t('flash.saveFailed'));
      setReviewedIds((current) => new Set(current).add(card.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('flash.saveFailed'));
    } finally {
      setSavingId('');
    }
  }

  if (loading) return <div className="rounded-2xl border border-slate-700 bg-[#0f1829] py-20 text-center text-slate-400">{t('flash.loading')}</div>;
  if (error && cards.length === 0) return <p role="alert" className="rounded-xl border border-rose-900 bg-rose-950/50 p-4 text-sm text-rose-200">{error}</p>;
  if (cards.length === 0) return <div className="rounded-2xl border border-dashed border-slate-700 bg-[#0f1829] py-20 text-center text-slate-400">{t('flash.empty')}</div>;

  const progress = Math.round((reviewedIds.size / cards.length) * 100);
  const tagList = tags.filter(Boolean).slice(0, 4);

  return (
    <section className="space-y-5">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-300">{t('flash.activeRecall')}</p>
          <h2 className="mt-1 text-xl font-semibold text-white sm:text-2xl">{t('workspace.flashcards')}</h2>
          <p className="mt-2 text-sm text-slate-400">{t('flash.help')}</p>
        </div>
        <div className="rounded-xl border border-slate-700 bg-[#0f1829] px-4 py-3 text-sm">
          <span className="font-bold text-slate-100">{reviewedIds.size} / {cards.length}</span>
          <span className="ml-2 text-slate-400">{t('flash.reviewedSession')}</span>
        </div>
      </header>

      <div className="h-1.5 overflow-hidden rounded-full bg-slate-800" aria-label={'Session progress ' + progress + '%'}>
        <div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: progress + '%' }} />
      </div>

      {error && <p role="alert" className="rounded-xl border border-rose-900 bg-rose-950/50 p-3 text-sm text-rose-200">{error}</p>}

      {reviewedIds.size === cards.length && <p role="status" className="rounded-xl border border-emerald-900 bg-emerald-950/40 p-3 text-sm text-emerald-200">{t('flash.allReviewed')}</p>}

      <div className="grid items-stretch gap-4 md:grid-cols-2">
        {cards.map((card, index) => {
          const revealed = revealedIds.has(card.id);
          const reviewed = reviewedIds.has(card.id);
          const saving = savingId === card.id;
          return (
            <article key={card.id} className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-800 bg-[#0f1829] transition-colors hover:border-slate-700">
              <header className="flex items-center justify-between gap-3 border-b border-slate-800 px-5 py-4">
                <span className="text-sm font-medium text-slate-300">{t(revealed ? 'flash.answer' : 'flash.question')}</span>
                <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-400">#{index + 1}</span>
              </header>
              <button type="button" onClick={() => toggleReveal(card.id)} aria-expanded={revealed} className="flex min-h-52 flex-1 flex-col items-center justify-center gap-5 px-5 py-8 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-500">
                {revealed ? (
                  <>
                    <p className="whitespace-pre-wrap text-base font-medium leading-7 text-sky-100 sm:text-lg">{card.back}</p>
                    <span className="text-xs text-slate-500">{t('flash.hide')}</span>
                  </>
                ) : (
                  <>
                    <p className="whitespace-pre-wrap text-base font-semibold leading-7 text-slate-100 sm:text-lg">{card.front}</p>
                    <span className="text-sm text-slate-400">{t('flash.reveal')}</span>
                  </>
                )}
              </button>
              <footer className="space-y-4 border-t border-slate-800 px-5 py-4">
                {tagList.length > 0 && <div className="flex flex-wrap gap-2">{tagList.map((tag) => <span key={tag} className="rounded-full bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300">{tag}</span>)}</div>}
                {reviewed ? (
                  <p className="text-xs font-semibold text-emerald-300">{t('flash.reviewSaved')}</p>
                ) : revealed ? (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-400">{t('flash.howRecall')}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {gradeOptions.map((option) => (
                        <button key={option.grade} type="button" disabled={Boolean(savingId)} onClick={() => void grade(card, option.grade)} className={'rounded-lg border px-3 py-2 text-sm font-semibold transition disabled:cursor-wait disabled:opacity-50 ' + option.className}>
                          {saving ? t('flash.saving') : t(option.labelKey)}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">{t('flash.revealtoReview')}</p>
                )}
              </footer>
            </article>
          );
        })}
      </div>
    </section>
  );
}
