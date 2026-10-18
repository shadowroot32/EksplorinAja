import Link from 'next/link';

const features = [
  { icon: '🧠', title: 'AI flashcards', desc: 'Remember more with cards built from your own learning material.', tone: 'bg-violet-50 text-violet-700' },
  { icon: '✍️', title: 'Smart quizzes', desc: 'Check what you know and discover the next thing to practice.', tone: 'bg-rose-50 text-rose-700' },
  { icon: '💬', title: 'AI study buddy', desc: 'Ask follow-up questions and get answers grounded in your material.', tone: 'bg-sky-50 text-sky-700' },
  { icon: '📄', title: 'PDFs and videos', desc: 'Bring notes, PDFs, or YouTube lessons into one study space.', tone: 'bg-amber-50 text-amber-700' },
  { icon: '📈', title: 'Progress that matters', desc: 'See your learning momentum and revisit ideas at the right time.', tone: 'bg-emerald-50 text-emerald-700' },
  { icon: '🎯', title: 'Focus by subject', desc: 'Keep every class organized and know where to focus next.', tone: 'bg-indigo-50 text-indigo-700' },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-sky-50 text-slate-900">
      <nav className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" className="inline-flex items-center gap-3" aria-label="Cendekia.ai home">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-blue-700 text-xl font-black text-white shadow-lg shadow-blue-600/20">C</span>
          <span><span className="block text-lg font-extrabold tracking-tight">Cendekia.ai</span><span className="block text-xs text-slate-500">Learn · Practice · Grow</span></span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/login" className="hidden rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-white hover:text-blue-700 sm:inline-flex">Sign in</Link>
          <Link href="/login" className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:bg-blue-700">Get started <span aria-hidden="true">→</span></Link>
        </div>
      </nav>

      <section className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-10 sm:px-8 sm:pt-14 lg:grid-cols-[1.02fr_.98fr] lg:gap-8 lg:pb-28 lg:pt-16">
        <div aria-hidden="true" className="pointer-events-none absolute -left-24 top-8 h-72 w-72 rounded-full bg-sky-200/60 blur-3xl" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/80 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-sky-700 shadow-sm"><span aria-hidden="true">✦</span> Your AI-powered learning space</div>
          <h1 className="mt-6 max-w-2xl text-4xl font-black leading-[1.08] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">Study smarter.<br /><span className="bg-gradient-to-r from-blue-700 via-sky-600 to-emerald-500 bg-clip-text text-transparent">Remember longer.</span></h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">Transform class notes, PDFs, and videos into summaries, flashcards, and quizzes—then follow a learning routine that helps knowledge stick.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/login" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-7 py-4 text-sm font-bold text-white shadow-xl shadow-blue-600/20 transition hover:-translate-y-0.5 hover:bg-blue-700">Start learning for free <span aria-hidden="true">→</span></Link>
            <Link href="#features" className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-7 py-4 text-sm font-bold text-slate-700 shadow-sm transition hover:border-sky-200 hover:bg-sky-50">Explore features</Link>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-slate-500"><span className="inline-flex items-center gap-2"><span className="text-emerald-600" aria-hidden="true">✓</span>No password to remember</span><span className="inline-flex items-center gap-2"><span className="text-emerald-600" aria-hidden="true">✓</span>Your own study library</span></div>
        </div>

        <div className="relative mx-auto w-full max-w-2xl lg:pl-3">
          <div aria-hidden="true" className="absolute inset-5 rounded-[2.5rem] bg-gradient-to-br from-sky-300 via-blue-300 to-emerald-200 opacity-70 blur-2xl" />
          <div className="relative overflow-hidden rounded-[2rem] border border-white/90 bg-white/95 p-3 shadow-2xl shadow-blue-900/15 sm:p-4">
            <div className="flex items-center justify-between rounded-t-[1.4rem] border-b border-slate-100 px-3 py-3 sm:px-4"><div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 font-black text-white">C</span><span className="text-sm font-extrabold">Your learning space</span></div><div className="flex gap-1.5" aria-hidden="true"><span className="h-2.5 w-2.5 rounded-full bg-rose-300" /><span className="h-2.5 w-2.5 rounded-full bg-amber-300" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-300" /></div></div>
            <div className="grid gap-3 p-2 sm:grid-cols-[100px_1fr] sm:gap-4 sm:p-3">
              <aside className="hidden space-y-2 rounded-2xl bg-slate-50 p-3 sm:block"><div className="mb-4 rounded-xl bg-blue-100 px-3 py-2 text-xs font-bold text-blue-700">⌂ Overview</div><div className="px-3 py-2 text-xs font-medium text-slate-400">▤ Subjects</div><div className="px-3 py-2 text-xs font-medium text-slate-400">✧ Study sets</div><div className="px-3 py-2 text-xs font-medium text-slate-400">◷ Progress</div><div className="mt-8 rounded-xl bg-gradient-to-br from-amber-100 to-orange-50 p-3 text-center"><div className="text-xl" aria-hidden="true">🏆</div><div className="mt-1 text-[10px] font-bold text-amber-800">Keep going!</div></div></aside>
              <div className="min-w-0 space-y-3">
                <div className="rounded-2xl bg-gradient-to-br from-sky-200 via-blue-200 to-cyan-100 p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3"><div><div className="text-xs font-bold uppercase tracking-wider text-blue-800">A little every day</div><div className="mt-2 text-xl font-black leading-tight text-slate-900 sm:text-2xl">Hello, curious mind! 👋</div><div className="mt-2 max-w-xs text-xs leading-5 text-slate-700 sm:text-sm">One focused session can move you forward.</div></div><div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.4rem] bg-white/60 text-4xl shadow-sm sm:h-20 sm:w-20">🧠</div></div>
                  <div className="mt-4 inline-flex rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white">Continue learning <span className="ml-2" aria-hidden="true">→</span></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-slate-100 bg-white p-3 sm:p-4"><div className="flex items-center justify-between text-xs font-semibold text-slate-500"><span>Study streak</span><span aria-hidden="true">🔥</span></div><div className="mt-2 text-2xl font-black text-slate-900">5 days</div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full w-3/4 rounded-full bg-orange-400" /></div></div>
                  <div className="rounded-2xl border border-slate-100 bg-white p-3 sm:p-4"><div className="flex items-center justify-between text-xs font-semibold text-slate-500"><span>Weekly goal</span><span aria-hidden="true">🎯</span></div><div className="mt-2 text-2xl font-black text-slate-900">4 / 5</div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full w-4/5 rounded-full bg-sky-500" /></div></div>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white p-3 sm:p-4"><div className="mb-3 flex items-center justify-between"><span className="text-sm font-extrabold">Build your skills</span><span className="text-xs font-semibold text-blue-600">View all</span></div><div className="grid grid-cols-3 gap-2"><div className="rounded-xl bg-violet-50 p-2 text-center"><div className="text-xl">🎧</div><div className="mt-1 text-[10px] font-bold text-violet-700 sm:text-xs">Review</div></div><div className="rounded-xl bg-emerald-50 p-2 text-center"><div className="text-xl">📚</div><div className="mt-1 text-[10px] font-bold text-emerald-700 sm:text-xs">Practice</div></div><div className="rounded-xl bg-amber-50 p-2 text-center"><div className="text-xl">✨</div><div className="mt-1 text-[10px] font-bold text-amber-700 sm:text-xs">Discover</div></div></div></div>
              </div>
            </div>
          </div>
          <div className="absolute -right-1 top-16 hidden rounded-2xl border border-white bg-white px-4 py-3 shadow-xl sm:block lg:-right-5"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-xl">✨</span><span><span className="block text-xs text-slate-500">Learning momentum</span><span className="block text-sm font-extrabold text-slate-900">Looking good!</span></span></div></div>
        </div>
      </section>

      <section id="features" className="border-y border-sky-100 bg-white/80 py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="mx-auto max-w-2xl text-center"><span className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Made for real progress</span><h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Everything you need to study with confidence</h2><p className="mt-4 leading-7 text-slate-500">Less time organizing, more time understanding and remembering.</p></div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => <article key={feature.title} className="group rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-sky-200 hover:shadow-xl hover:shadow-blue-900/5"><div className={'flex h-12 w-12 items-center justify-center rounded-2xl text-2xl ' + feature.tone} aria-hidden="true">{feature.icon}</div><h3 className="mt-5 text-lg font-extrabold text-slate-900">{feature.title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{feature.desc}</p></article>)}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-20 text-center sm:px-8 sm:py-24"><div className="rounded-[2rem] bg-gradient-to-br from-blue-700 via-blue-600 to-sky-500 px-6 py-12 text-white shadow-2xl shadow-blue-900/15 sm:px-12 sm:py-16"><div className="text-4xl" aria-hidden="true">🚀</div><h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Make your next study session count.</h2><p className="mx-auto mt-4 max-w-xl leading-7 text-blue-50">Start with one topic, build a better routine, and watch your understanding grow.</p><Link href="/login" className="mt-8 inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-7 py-3.5 text-sm font-extrabold text-blue-700 shadow-lg transition hover:-translate-y-0.5 hover:bg-blue-50">Create your free account <span aria-hidden="true">→</span></Link></div></section>
      <footer className="border-t border-sky-100 bg-white/70 px-5 py-7 text-center text-sm text-slate-500">© 2026 Cendekia.ai · Learn something new every day.</footer>
    </main>
  );
}
