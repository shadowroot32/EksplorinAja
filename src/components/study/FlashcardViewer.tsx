'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

interface Flashcard { id: string; front: string; back: string; interval: number; easeFactor: number; repetitions: number; dueDate: string; }
type Grade = 0 | 1 | 2 | 3 | 4 | 5;

export default function FlashcardViewer({ studySetId }: { studySetId: string }) {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/study-sets/${studySetId}/flashcards`)
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error || 'Flashcards could not be loaded.');
        if (!cancelled) setCards(Array.isArray(payload) ? payload : []);
      })
      .catch(() => { if (!cancelled) setError('Flashcards could not be loaded. Refresh the page to try again.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [studySetId]);

  async function grade(value: Grade) {
    const card = cards[idx];
    if (!card || saving) return;
    setSaving(true);
    setError('');
    try {
      const response = await fetch(`/api/study-sets/${studySetId}/flashcards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId: card.id, grade: value }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Review could not be saved. Try again.');
      if (idx + 1 >= cards.length) {
        setDone(true);
      } else {
        setIdx((current) => current + 1);
        setFlipped(false);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Review could not be saved. Try again.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="py-20 text-center text-slate-500">Loading flashcards…</div>;
  if (error && cards.length === 0) return <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</p>;
  if (cards.length === 0) return <div className="py-20 text-center text-slate-600">No flashcards yet.</div>;

  if (done) return (
    <div className="space-y-4 py-20 text-center">
      <div className="text-5xl" aria-hidden="true">🎉</div>
      <h2 className="text-xl font-semibold text-slate-900">Session complete!</h2>
      <p className="text-slate-600">{cards.length} cards reviewed.</p>
      <p className="text-sm text-slate-500">Your daily goal and subject mastery have been updated.</p>
      <Button onClick={() => { setIdx(0); setFlipped(false); setDone(false); setError(''); }}>Review Again</Button>
    </div>
  );

  const card = cards[idx];

  return (
    <div className="space-y-6">
      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      <div className="flex justify-between text-sm text-slate-600">
        <span>Card {idx + 1} of {cards.length}</span>
        <span>{Math.round((idx / cards.length) * 100)}% done</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: ((idx / cards.length) * 100) + '%' }} />
      </div>
      <button type="button" className="flip-card h-64 w-full cursor-pointer text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100" onClick={() => setFlipped((current) => !current)} aria-label={flipped ? 'Hide answer' : 'Reveal answer'}>
        <span className={`flip-card-inner relative block h-full w-full ${flipped ? 'flipped' : ''}`}>
          <span className="flip-card-front absolute inset-0 flex items-center justify-center rounded-xl border border-slate-300 bg-white p-8">
            <span className="text-center text-xl leading-relaxed text-slate-900">{card.front}</span>
          </span>
          <span className="flip-card-back absolute inset-0 flex items-center justify-center rounded-xl border border-emerald-500/40 bg-white p-8">
            <span className="text-center text-xl leading-relaxed text-slate-900">{card.back}</span>
          </span>
        </span>
      </button>

      {!flipped ? (
        <p className="text-center text-sm text-slate-500">Click the card to reveal the answer.</p>
      ) : (
        <div className="space-y-3">
          <p className="text-center text-sm font-medium text-slate-600">How well did you know this?</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              { grade: 1 as const, label: '😞 Again', cls: 'border-rose-200 text-rose-700 hover:bg-rose-50' },
              { grade: 2 as const, label: '😓 Forgot', cls: 'border-orange-200 text-orange-700 hover:bg-orange-50' },
              { grade: 3 as const, label: '😐 Hard', cls: 'border-amber-200 text-amber-700 hover:bg-amber-50' },
              { grade: 4 as const, label: '🙂 Good', cls: 'border-emerald-200 text-emerald-700 hover:bg-emerald-50' },
              { grade: 5 as const, label: '😄 Easy', cls: 'border-blue-200 text-blue-700 hover:bg-blue-50' },
              { grade: 0 as const, label: '❌ Blackout', cls: 'border-slate-200 text-slate-700 hover:bg-slate-50' },
            ].map((option) => (
              <button key={option.grade} type="button" disabled={saving} onClick={() => void grade(option.grade)}
                className={`rounded-xl border py-2.5 text-sm font-medium transition-colors disabled:cursor-wait disabled:opacity-50 ${option.cls}`}>
                {option.label}
              </button>
            ))}
          </div>
          {saving && <p className="text-center text-sm text-slate-500">Saving your progress…</p>}
        </div>
      )}
    </div>
  );
}
