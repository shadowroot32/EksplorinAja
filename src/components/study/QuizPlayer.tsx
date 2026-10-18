'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

interface QuizItem { id: string; question: string; options: string[]; correctIndex: number; explanation: string; }

export default function QuizPlayer({ studySetId }: { studySetId: string }) {
  const [items, setItems] = useState<QuizItem[]>([]);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch(`/api/study-sets/${studySetId}/quiz`).then(r => r.json()).then(setItems);
  }, [studySetId]);

  function pick(i: number) {
    if (selected !== null) return;
    setSelected(i);
    if (i === items[idx].correctIndex) setScore(s => s + 1);
  }

  function next() {
    if (idx + 1 >= items.length) { setDone(true); return; }
    setIdx(i => i + 1); setSelected(null);
  }

  if (items.length === 0) return <div className="text-slate-600 text-center py-20">No quiz questions yet.</div>;

  if (done) return (
    <div className="text-center py-20 space-y-4">
      <div className="text-5xl">{score >= items.length * 0.7 ? '🏆' : '📚'}</div>
      <h2 className="text-xl font-semibold text-slate-900">Quiz Complete!</h2>
      <p className="text-slate-600">{score} / {items.length} correct ({Math.round(score / items.length * 100)}%)</p>
      <Button onClick={() => { setIdx(0); setScore(0); setSelected(null); setDone(false); }}>Retry Quiz</Button>
    </div>
  );

  const q = items[idx];

  return (
    <div className="space-y-6">
      <div className="flex justify-between text-sm text-slate-600">
        <span>Question {idx + 1} of {items.length}</span>
        <span>Score: {score}</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${(idx / items.length) * 100}%` }} />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <p className="text-lg text-slate-900 font-medium leading-relaxed">{q.question}</p>
      </div>

      <div className="space-y-3">
        {q.options.map((opt, i) => {
          let cls = 'w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-colors ';
          if (selected === null) cls += 'border-slate-300 text-slate-700 hover:border-emerald-500/50 hover:bg-slate-100';
          else if (i === q.correctIndex) cls += 'border-emerald-500 bg-emerald-50 text-emerald-300';
          else if (i === selected) cls += 'border-red-500 bg-red-500/10 text-red-300';
          else cls += 'border-slate-200 text-slate-500';
          return <button key={i} className={cls} onClick={() => pick(i)}>{String.fromCharCode(65 + i)}. {opt}</button>;
        })}
      </div>

      {selected !== null && (
        <div className="space-y-3">
          <div className={`p-4 rounded-xl text-sm ${selected === q.correctIndex ? 'bg-emerald-50 border border-emerald-200 text-emerald-300' : 'bg-red-500/10 border border-red-500/30 text-red-300'}`}>
            {selected === q.correctIndex ? '✓ Correct! ' : `✗ Incorrect. Correct: ${q.options[q.correctIndex]}. `}
            {q.explanation}
          </div>
          <Button onClick={next} className="w-full">{idx + 1 < items.length ? 'Next Question →' : 'See Results'}</Button>
        </div>
      )}
    </div>
  );
}
