'use client';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Message { id: string; role: 'user' | 'assistant'; content: string; createdAt: string; }

export default function ChatInterface({ studySetId }: { studySetId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/study-sets/${studySetId}/chat`).then(r => r.json()).then(setMessages);
  }, [studySetId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const userMsg = input.trim(); setInput(''); setLoading(true);

    // optimistic
    const tempId = `tmp-${Date.now()}`;
    setMessages(p => [...p, { id: tempId, role: 'user', content: userMsg, createdAt: new Date().toISOString() }]);

    const res = await fetch(`/api/study-sets/${studySetId}/chat`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userMsg }),
    });
    if (res.ok) {
      const reply = await res.json();
      setMessages(p => [...p, reply]);
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col h-[60vh] bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-slate-500 py-10">
            <p className="text-2xl mb-2">💬</p>
            <p>Ask anything about this study set</p>
          </div>
        )}
        {messages.map(m => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
              m.role === 'user'
                ? 'bg-emerald-600 text-white rounded-br-sm'
                : 'bg-slate-800 text-slate-200 rounded-bl-sm'
            }`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-800 text-slate-400 px-4 py-3 rounded-2xl rounded-bl-sm text-sm">
              <span className="animate-pulse">Thinking…</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} className="flex gap-2 p-4 border-t border-slate-800">
        <Input
          value={input} onChange={e => setInput(e.target.value)}
          placeholder="Ask about this study material…"
          disabled={loading} className="flex-1"
        />
        <Button type="submit" disabled={loading || !input.trim()}>Send</Button>
      </form>
    </div>
  );
}
