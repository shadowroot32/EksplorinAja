'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePreferences } from '@/components/providers/PreferencesProvider';

type Grade = 0 | 1 | 2 | 3 | 4 | 5;
interface ReviewCard {
  id: string;
  studySetId: string;
  studySetTitle: string;
  subjectName: string | null;
  front: string;
  back: string;
  dueDate: string;
}
interface Cursor { dueDate: string; id: string; }

const gradeOptions: Array<{ grade: Grade; labelKey: string; style: string }> = [
  { grade: 1, labelKey: 'review.again', style: 'border-rose-200 text-rose-700 hover:bg-rose-50' },
  { grade: 2, labelKey: 'review.forgot', style: 'border-orange-200 text-orange-700 hover:bg-orange-50' },
  { grade: 3, labelKey: 'review.hard', style: 'border-amber-200 text-amber-700 hover:bg-amber-50' },
  { grade: 4, labelKey: 'review.good', style: 'border-emerald-200 text-emerald-700 hover:bg-emerald-50' },
  { grade: 5, labelKey: 'review.easy', style: 'border-blue-200 text-blue-700 hover:bg-blue-50' },
];

export default function ReviewPage() {
  const { t } = usePreferences();
  const [cards, setCards] = useState<ReviewCard[]>([]);
  const [nextCursor, setNextCursor] = useState<Cursor | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/reviews')
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || t('review.loadError'));
        if (!cancelled) {
          setCards(Array.isArray(payload.cards) ? payload.cards : []);
          setNextCursor(payload.nextCursor ?? null);
        }
      })
      .catch(() => { if (!cancelled) setError(t('review.loadError')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [t]);

  async function loadNextPage() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    setError('');
    try {
      const cursor = nextCursor;
      const query = '?cursorDueDate=' + encodeURIComponent(cursor.dueDate) + '&cursorId=' + encodeURIComponent(cursor.id);
      const response = await fetch('/api/reviews' + query);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || t('review.loadMoreError'));
      setCards(Array.isArray(payload.cards) ? payload.cards : []);
      setNextCursor(payload.nextCursor ?? null);
      setFlipped(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('review.loadMoreError'));
    } finally {
      setLoadingMore(false);
    }
  }

  async function review(grade: Grade) {
    const card = cards[0];
    if (!card || saving) return;
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId: card.id, grade }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || t('review.saveError'));
      const remaining = cards.filter((item) => item.id !== card.id);
      setCards(remaining);
      setReviewed((current) => current + 1);
      setFlipped(false);
      if (remaining.length === 0 && nextCursor) await loadNextPage();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('review.saveError'));
    } finally {
      setSaving(false);
    }
  }

  const card = cards[0];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-blue-600">{t('review.subtitle')}</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">{t('review.title')}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">{t('review.help')}</p>
        </div>
        <Link href="/library" className="text-sm font-bold text-blue-700 hover:text-blue-900">{t('review.library')} →</Link>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm">
        <span className="font-semibold text-slate-700">{t('review.session').replace('{n}', String(reviewed))}</span>
        {nextCursor && <span className="text-slate-500">{t('review.moreAuto')}</span>}
      </div>

      {error && <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}

      {loading || loadingMore ? (
        <div className="rounded-3xl border border-slate-200 bg-white px-6 py-20 text-center text-slate-500">{t('review.loading')}</div>
      ) : !card ? (
        <div className="rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
          <div className="text-5xl" aria-hidden="true">🎉</div>
          <h2 className="mt-4 text-xl font-black text-slate-950">{reviewed === 0 ? t('review.allCaughtUp') : t('review.complete')}</h2>
          <p className="mt-2 text-sm text-slate-500">{nextCursor ? t('review.moreWaiting') : t('review.noMore')}</p>
          {nextCursor
            ? <button type="button" onClick={() => void loadNextPage()} className="mt-5 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700">{t('review.loadMore')}</button>
            : <Link href="/dashboard" className="mt-5 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700">{t('review.backDashboard')}</Link>}
        </div>
      ) : (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-xs font-bold uppercase tracking-wider text-blue-700">{card.subjectName || t('review.uncategorized')} · {card.studySetTitle}</p>
              <p className="mt-1 text-sm text-slate-500">{t('review.nextDue')} · {cards.length} {t('review.loaded')}</p>
            </div>
            <span className="shrink-0 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">{t('review.due')}</span>
          </div>
          <button
            type="button"
            onClick={() => setFlipped((current) => !current)}
            className="mt-6 flex min-h-72 w-full items-center justify-center rounded-2xl border border-slate-200 bg-gradient-to-br from-sky-50 to-white p-8 text-center transition hover:border-blue-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
            aria-label={flipped ? t('review.hideAnswer') : t('review.revealAnswer')}
          >
            <span className="max-w-2xl text-xl font-semibold leading-relaxed text-slate-900">{flipped ? card.back : card.front}</span>
          </button>
          <p className="mt-3 text-center text-xs text-slate-400">{flipped ? t('review.rate') : t('review.revealFirst')}</p>
          {flipped && <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {gradeOptions.map((option) => <button
              key={option.grade}
              type="button"
              disabled={saving}
              onClick={() => void review(option.grade)}
              className={'rounded-xl border px-3 py-3 text-sm font-bold transition disabled:cursor-wait disabled:opacity-50 ' + option.style}
            >
              {t(option.labelKey)}
            </button>)}
          </div>}
          {saving && <p className="mt-4 text-center text-sm text-slate-500">{t('review.saveProgress')}</p>}
        </section>
      )}
    </div>
  );
}
