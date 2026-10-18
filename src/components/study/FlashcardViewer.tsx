'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { sm2 } from '@/lib/sm2';

interface Flashcard { id: string; front: string; back: string; interval: number; easeFactor: number; repetitions: number; dueDate: string; }

export default function FlashcardViewer({ studySetId }: { studySetId: string }) {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch(`/api/study-sets/${studySetId}/flashcards`).then(r => r.json()).then(setCards);
  }, [studySetId]);

  async function grade(g: 0 | 1 | 2 | 3 | 4 | 5) {
    const card = cards[idx];
    await fetch(`/api/study-sets/${studySetId}/flashcards`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardId: card.id, grade: g }),
    });
    if (idx + 1 >= cards.length) { setDone(true); return; }
    setIdx(i => i + 1);
    setFlipped(false);
  }

  if (cards.length === 0) return <div className="text-slate-400 text-center py-20">No flashcards yet.</div>;

  if (done) return (
    <div className="text-center py-20 space-y-4">
      <div className="text-5xl">🎉</div>
      <h2 className="text-xl font-semibold text-slate-100">Session complete!</h2>
      <p className="text-slate-400">{cards.length} cards reviewed.</p>
      <Button onClick={() => { setIdx(0); setFlipped(false); setDone(false); }}>Review Again</Button>
    </div>
  );

  const card = cards[idx];

  return (
    <div className="space-y-6">
      <div className="flex justify-between text-sm text-slate-400">
        <span>Card {idx + 1} of {cards.length}</span>
        <span>{Math.round((idx / cards.length) * 100)}% done</span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${(idx / cards.length) * 100}%` }} />
      </div>

      {/* 3D flip card */}
      <div className="flip-card w-full h-64 cursor-pointer" onClick={() => setFlipped(f => !f)}>
        <div className={`flip-card-inner relative w-full h-full ${flipped ? 'flipped' : ''}`}>
          <div className="flip-card-front absolute inset-0 bg-slate-900 border border-slate-700 rounded-xl flex items-center justify-center p-8">
            <p className="text-xl text-slate-100 text-center leading-relaxed">{card.front}</p>
          </div>
          <div className="flip-card-back absolute inset-0 bg-slate-900 border border-emerald-500/40 rounded-xl flex items-center justify-center p-8">
            <p className="text-xl text-slate-100 text-center leading-relaxed">{card.back}</p>
          </div>
        </div>
      </div>

      {!flipped ? (
        <p className="text-center text-slate-500 text-sm">Click card to reveal answer</p>
      ) : (
        <div className="space-y-3">
          <p className="text-center text-slate-400 text-sm font-medium">How well did you know this?</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { grade: 1 as const, label: '😞 Again', cls: 'border-red-700 text-red-400 hover:bg-red-900/20' },
              { grade: 3 as const, label: '😐 Hard', cls: 'border-yellow-700 text-yellow-400 hover:bg-yellow-900/20' },
              { grade: 4 as const, label: '🙂 Good', cls: 'border-emerald-700 text-emerald-400 hover:bg-emerald-900/20' },
              { grade: 5 as const, label: '😄 Easy', cls: 'border-teal-600 text-teal-400 hover:bg-teal-900/20' },
              { grade: 2 as const, label: '😓 Forgot', cls: 'border-orange-700 text-orange-400 hover:bg-orange-900/20' },
              { grade: 0 as const, label: '❌ Blackout', cls: 'border-slate-700 text-slate-400 hover:bg-slate-800' },
            ].map(btn => (
              <button key={btn.grade} onClick={() => grade(btn.grade)}
                className={`py-2.5 rounded-lg border text-sm font-medium transition-colors ${btn.cls}`}>
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
