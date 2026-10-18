import Link from 'next/link';

const features = [
  { icon: '🧠', title: 'AI Flashcards', desc: 'Auto-generated spaced repetition cards from any source.' },
  { icon: '📝', title: 'Smart Quizzes', desc: 'Multiple-choice quizzes built from your material.' },
  { icon: '💬', title: 'AI Chat Tutor', desc: 'Ask questions about your study set and get instant answers.' },
  { icon: '📄', title: 'PDF & YouTube', desc: 'Drop a PDF or YouTube link — we handle the rest.' },
  { icon: '📊', title: 'Progress Tracking', desc: 'SM-2 spaced repetition keeps you reviewing at the right time.' },
  { icon: '🎯', title: 'Mastery Scores', desc: 'Per-subject mastery levels so you know where to focus.' },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-slate-800 max-w-7xl mx-auto">
        <span className="text-xl font-bold text-emerald-400">Cendekia.ai</span>
        <Link href="/login" className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors">
          Get Started
        </Link>
      </nav>

      <section className="max-w-4xl mx-auto px-6 py-28 text-center">
        <div className="inline-block bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm px-4 py-1.5 rounded-full mb-6">
          AI-Powered Study Assistant
        </div>
        <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-br from-emerald-400 to-teal-400 bg-clip-text text-transparent leading-tight">
          Learn Anything,<br />Remember Everything
        </h1>
        <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
          Upload a PDF, paste a YouTube link, or write your notes — Cendekia.ai turns it into flashcards, quizzes, and summaries instantly.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/login" className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-xl text-base font-medium transition-colors">
            Start for Free
          </Link>
          <Link href="#features" className="border border-slate-700 hover:border-slate-600 text-slate-300 px-8 py-3 rounded-xl text-base font-medium transition-colors">
            See Features
          </Link>
        </div>
      </section>

      <section id="features" className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-12 text-slate-100">Everything you need to study smarter</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(f => (
            <div key={f.title} className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-emerald-500/30 transition-colors">
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="font-semibold text-slate-100 mb-2">{f.title}</h3>
              <p className="text-sm text-slate-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-2xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl font-bold mb-4 text-slate-100">Ready to study smarter?</h2>
        <p className="text-slate-400 mb-8">No credit card required. Start with any content in seconds.</p>
        <Link href="/login" className="bg-emerald-500 hover:bg-emerald-600 text-white px-10 py-3.5 rounded-xl text-base font-medium transition-colors inline-block">
          Create Free Account
        </Link>
      </section>

      <footer className="border-t border-slate-800 py-8 text-center text-slate-500 text-sm">
        © 2026 Cendekia.ai
      </footer>
    </main>
  );
}
