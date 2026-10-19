'use client';

import Link from 'next/link';
import ThemeLanguageControls from '@/components/layout/ThemeLanguageControls';
import { usePreferences } from '@/components/providers/PreferencesProvider';

const copy = {
  en: {
    tagline: 'Learn · Practice · Grow',
    signIn: 'Sign in',
    getStarted: 'Get started',
    eyebrow: 'Your AI-powered learning space',
    headlineOne: 'Study smarter.',
    headlineTwo: 'Remember longer.',
    hero: 'Turn notes, PDFs, and videos into summaries, flashcards, and quizzes. Build a learning routine that helps knowledge stick.',
    start: 'Start learning for free',
    explore: 'Explore features',
    trustOne: 'Secure Google sign-in',
    trustTwo: 'One home for your study material',
    preview: 'Your learning space',
    previewSample: 'Sample preview · not account data',
    overview: 'Overview',
    subjects: 'Subjects',
    studySets: 'Study sets',
    progress: 'Progress',
    everyDay: 'A little every day',
    curious: 'Hello, curious mind!',
    keepGoing: 'Keep going!',
    session: 'One focused session can move you forward.',
    continue: 'Continue learning',
    streak: 'Study streak',
    fiveDays: '5 days',
    weeklyGoal: 'Weekly goal',
    skills: 'Build your skills',
    review: 'Review',
    practice: 'Practice',
    discover: 'Discover',
    momentum: 'Learning momentum',
    lookingGood: 'Looking good!',
    featuresEyebrow: 'Made for real progress',
    featuresTitle: 'Everything you need to study with confidence',
    featuresIntro: 'Less time organizing, more time understanding and remembering.',
    features: [
      ['🧠', 'AI flashcards', 'Remember more with cards built from your own learning material.', 'bg-violet-50 text-violet-700'],
      ['✍️', 'Smart quizzes', 'Check what you know and discover the next thing to practice.', 'bg-rose-50 text-rose-700'],
      ['💬', 'AI study buddy', 'Ask follow-up questions grounded in your material.', 'bg-sky-50 text-sky-700'],
      ['📄', 'PDFs and videos', 'Bring notes, PDFs, and YouTube lessons into one study space.', 'bg-amber-50 text-amber-800'],
      ['📈', 'Progress that matters', 'See your learning momentum and revisit ideas at the right time.', 'bg-emerald-50 text-emerald-700'],
      ['🎯', 'Focus by subject', 'Keep every class organized and know where to focus next.', 'bg-indigo-50 text-indigo-700'],
    ],
    bottomTitle: 'Make your next study session count.',
    bottomBody: 'Start with one topic, build a better routine, and watch your understanding grow.',
    bottomCta: 'Create your free account',
    footer: 'Learn something new every day.',
  },
  id: {
    tagline: 'Belajar · Latihan · Berkembang',
    signIn: 'Masuk',
    getStarted: 'Mulai',
    eyebrow: 'Ruang belajar dengan dukungan AI',
    headlineOne: 'Belajar lebih cerdas.',
    headlineTwo: 'Ingat lebih lama.',
    hero: 'Ubah catatan, PDF, dan video menjadi ringkasan, flashcard, dan kuis. Bangun kebiasaan belajar yang membantu pengetahuan bertahan.',
    start: 'Mulai belajar gratis',
    explore: 'Jelajahi fitur',
    trustOne: 'Masuk aman dengan Google',
    trustTwo: 'Semua materi di satu tempat',
    preview: 'Ruang belajarmu',
    previewSample: 'Contoh tampilan · bukan data akun',
    overview: 'Beranda',
    subjects: 'Pelajaran',
    studySets: 'Materi belajar',
    progress: 'Progres',
    everyDay: 'Sedikit setiap hari',
    curious: 'Halo, pemikir penasaran!',
    keepGoing: 'Terus semangat!',
    session: 'Satu sesi fokus bisa membawamu maju.',
    continue: 'Lanjutkan belajar',
    streak: 'Konsistensi belajar',
    fiveDays: '5 hari',
    weeklyGoal: 'Target mingguan',
    skills: 'Bangun keahlianmu',
    review: 'Ulas',
    practice: 'Latihan',
    discover: 'Jelajahi',
    momentum: 'Momentum belajar',
    lookingGood: 'Terus berkembang!',
    featuresEyebrow: 'Dirancang untuk progres nyata',
    featuresTitle: 'Semua yang kamu butuhkan untuk belajar lebih yakin',
    featuresIntro: 'Kurangi waktu mengatur materi, tambah waktu untuk memahami dan mengingat.',
    features: [
      ['🧠', 'Flashcard AI', 'Ingat lebih banyak lewat kartu dari materi belajarmu.', 'bg-violet-50 text-violet-700'],
      ['✍️', 'Kuis pintar', 'Uji pemahaman dan temukan hal yang perlu dilatih.', 'bg-rose-50 text-rose-700'],
      ['💬', 'Teman belajar AI', 'Ajukan pertanyaan lanjutan berdasarkan materimu.', 'bg-sky-50 text-sky-700'],
      ['📄', 'PDF dan video', 'Satukan catatan, PDF, dan pelajaran YouTube.', 'bg-amber-50 text-amber-800'],
      ['📈', 'Progres yang berarti', 'Pantau perkembangan dan ulangi materi pada waktu yang tepat.', 'bg-emerald-50 text-emerald-700'],
      ['🎯', 'Fokus per pelajaran', 'Rapikan materi tiap kelas dan tahu apa yang perlu dipelajari.', 'bg-indigo-50 text-indigo-700'],
    ],
    bottomTitle: 'Buat sesi belajarmu berikutnya lebih berarti.',
    bottomBody: 'Mulai dari satu topik, bangun rutinitas yang lebih baik, dan lihat pemahamanmu berkembang.',
    bottomCta: 'Buat akun gratis',
    footer: 'Temukan hal baru setiap hari.',
  },
} as const;

export default function LandingPage() {
  const { locale } = usePreferences();
  const text = copy[locale];

  return (
    <main className="public-site relative min-h-screen overflow-hidden bg-[var(--public-bg)] text-[var(--public-text)] transition-colors duration-300">
      <header className="sticky top-0 z-30 border-b border-white/60 bg-white/75 shadow-[0_8px_30px_-24px_rgba(15,23,42,0.35)] backdrop-blur-2xl dark:border-slate-800/70 dark:bg-slate-950/75">
        <nav className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-8 lg:py-5">
          <Link href="/" className="inline-flex shrink-0 items-center gap-3" aria-label="EksplorinAja home">
            <span className="flex h-11 w-11 items-center justify-center rounded-[1.15rem] bg-gradient-to-br from-blue-600 via-blue-600 to-sky-400 text-xl font-black text-white shadow-lg shadow-blue-600/25">E</span>
            <span><span className="block text-lg font-extrabold tracking-tight text-[var(--public-text)]">EksplorinAja</span><span className="block text-xs text-[var(--public-muted)]">{text.tagline}</span></span>
          </Link>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="hidden lg:block"><ThemeLanguageControls /></div>
            <div className="lg:hidden"><ThemeLanguageControls compact /></div>
            <Link href="/login" className="hidden rounded-xl px-3 py-2.5 text-sm font-semibold text-[var(--public-muted)] transition hover:bg-[var(--public-soft)] hover:text-blue-600 sm:inline-flex">{text.signIn}</Link>
            <Link href="/login?mode=register" className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition duration-300 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-xl sm:px-6">{text.getStarted} <span aria-hidden="true">→</span></Link>
          </div>
        </nav>
      </header>

      <section className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-12 sm:px-8 sm:pb-24 sm:pt-16 lg:grid-cols-[0.92fr_1.08fr] lg:gap-10 lg:pb-28 lg:pt-20">
        <div aria-hidden="true" className="pointer-events-none absolute -left-24 top-8 h-72 w-72 rounded-full bg-sky-400/10 blur-3xl" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/75 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-blue-700 shadow-[0_8px_30px_-18px_rgba(37,99,235,0.35)] backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/70 dark:text-sky-300"><span aria-hidden="true">✦</span> {text.eyebrow}</div>
          <h1 className="mt-7 max-w-2xl text-5xl font-black leading-[1.02] tracking-[-0.045em] text-[var(--public-text)] sm:text-6xl lg:text-[4.25rem]">
            {text.headlineOne}<br /><span className="bg-gradient-to-r from-blue-600 via-sky-500 to-emerald-400 bg-clip-text text-transparent dark:from-sky-300 dark:via-blue-300 dark:to-emerald-300">{text.headlineTwo}</span>
          </h1>
          <p className="mt-6 max-w-xl text-[1.05rem] leading-8 text-[var(--public-muted)]">{text.hero}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/login?mode=register" className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-7 py-4 text-sm font-bold text-white shadow-xl shadow-blue-600/25 transition duration-300 hover:-translate-y-1 hover:bg-blue-700 hover:shadow-2xl">{text.start} <span aria-hidden="true">→</span></Link>
            <Link href="#features" className="inline-flex items-center justify-center rounded-full border border-[var(--public-border)] bg-white/80 px-7 py-4 text-sm font-bold text-[var(--public-text)] shadow-sm backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:border-sky-300 hover:bg-white dark:bg-slate-900/70 dark:hover:bg-slate-900">{text.explore}</Link>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-[var(--public-muted)]">
            <span className="inline-flex items-center gap-2"><span className="text-emerald-500" aria-hidden="true">✓</span>{text.trustOne}</span>
            <span className="inline-flex items-center gap-2"><span className="text-emerald-500" aria-hidden="true">✓</span>{text.trustTwo}</span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-2xl lg:pl-3">
          <div aria-hidden="true" className="absolute inset-5 rounded-[2.5rem] bg-gradient-to-br from-sky-400/25 via-blue-400/20 to-emerald-300/20 blur-2xl" />
          <div className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-white/90 p-3 shadow-[0_35px_100px_-42px_rgba(37,99,235,0.42)] backdrop-blur-xl sm:rounded-[2.25rem] sm:p-4 dark:border-slate-700/80 dark:bg-slate-900/90 dark:shadow-black/30">
            <div className="flex items-center justify-between rounded-t-[1.4rem] border-b border-[var(--public-border)] px-3 py-3 sm:px-4">
              <div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 font-black text-white">E</span><span className="text-sm font-extrabold">{text.preview}</span></div>
              <div className="flex gap-1.5" aria-hidden="true"><span className="h-2.5 w-2.5 rounded-full bg-rose-400" /><span className="h-2.5 w-2.5 rounded-full bg-amber-400" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /></div>
            </div>
            <div className="px-3 pt-2 sm:px-4">
              <span className="inline-flex max-w-full rounded-full bg-slate-50/90 px-3 py-1.5 text-[10px] font-semibold leading-4 text-slate-500 ring-1 ring-inset ring-slate-200/70 sm:text-xs dark:bg-slate-800/70 dark:text-slate-300 dark:ring-slate-700">{text.previewSample}</span>
            </div>
            <div className="grid gap-3 p-2 sm:grid-cols-[112px_1fr] sm:gap-4 sm:p-3">
              <aside className="hidden space-y-2 rounded-2xl bg-[var(--public-soft)] p-3 sm:block">
                <div className="mb-4 rounded-xl bg-blue-100 px-3 py-2 text-xs font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-200">⌂ {text.overview}</div>
                <div className="px-3 py-2 text-xs font-medium text-[var(--public-muted)]">▤ {text.subjects}</div>
                <div className="px-3 py-2 text-xs font-medium text-[var(--public-muted)]">✧ {text.studySets}</div>
                <div className="px-3 py-2 text-xs font-medium text-[var(--public-muted)]">◷ {text.progress}</div>
                <div className="mt-8 rounded-xl bg-gradient-to-br from-amber-100 to-orange-50 p-3 text-center dark:from-amber-950/50 dark:to-orange-950/40"><div className="text-xl" aria-hidden="true">🏆</div><div className="mt-1 text-[10px] font-bold text-amber-800 dark:text-amber-200">{text.keepGoing}</div></div>
              </aside>
              <div className="min-w-0 space-y-3">
                <div className="rounded-[1.5rem] bg-gradient-to-br from-sky-100 via-blue-50 to-emerald-50 p-4 ring-1 ring-white/80 sm:p-5 dark:from-[#193452] dark:via-[#172b4a] dark:to-[#10243a] dark:ring-slate-700">
                  <div className="flex items-start justify-between gap-3">
                    <div><div className="text-xs font-bold uppercase tracking-wider text-blue-800 dark:text-sky-300">{text.everyDay}</div><div className="mt-2 text-xl font-black leading-tight text-slate-900 dark:text-white sm:text-2xl">{text.curious} 👋</div><div className="mt-2 max-w-xs text-xs leading-5 text-slate-600 dark:text-slate-300 sm:text-sm">{text.session}</div></div>
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.4rem] bg-white/70 text-4xl shadow-sm dark:bg-slate-900/60 sm:h-20 sm:w-20">🧠</div>
                  </div>
                  <div className="mt-4 inline-flex rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white">{text.continue} <span className="ml-2" aria-hidden="true">→</span></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-[var(--public-border)] bg-[var(--public-surface)] p-3 sm:p-4"><div className="flex items-center justify-between text-xs font-semibold text-[var(--public-muted)]"><span>{text.streak}</span><span aria-hidden="true">🔥</span></div><div className="mt-2 text-2xl font-black text-[var(--public-text)]">{text.fiveDays}</div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--public-soft)]"><div className="h-full w-3/4 rounded-full bg-orange-400" /></div></div>
                  <div className="rounded-2xl border border-[var(--public-border)] bg-[var(--public-surface)] p-3 sm:p-4"><div className="flex items-center justify-between text-xs font-semibold text-[var(--public-muted)]"><span>{text.weeklyGoal}</span><span aria-hidden="true">🎯</span></div><div className="mt-2 text-2xl font-black text-[var(--public-text)]">4 / 5</div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--public-soft)]"><div className="h-full w-4/5 rounded-full bg-sky-500" /></div></div>
                </div>
                <div className="rounded-2xl border border-[var(--public-border)] bg-[var(--public-surface)] p-3 sm:p-4"><div className="mb-3 flex items-center justify-between"><span className="text-sm font-extrabold">{text.skills}</span><span className="text-xs font-semibold text-blue-600 dark:text-sky-300">{text.explore}</span></div><div className="grid grid-cols-3 gap-2"><div className="rounded-xl bg-violet-50 p-2 text-center dark:bg-violet-950/40"><div className="text-xl">🎧</div><div className="mt-1 text-[10px] font-bold text-violet-700 dark:text-violet-200 sm:text-xs">{text.review}</div></div><div className="rounded-xl bg-emerald-50 p-2 text-center dark:bg-emerald-950/40"><div className="text-xl">📚</div><div className="mt-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-200 sm:text-xs">{text.practice}</div></div><div className="rounded-xl bg-amber-50 p-2 text-center dark:bg-amber-950/40"><div className="text-xl">✨</div><div className="mt-1 text-[10px] font-bold text-amber-800 dark:text-amber-200 sm:text-xs">{text.discover}</div></div></div></div>
              </div>
            </div>
          </div>
          <div className="absolute -right-1 top-16 hidden rounded-2xl border border-[var(--public-border)] bg-[var(--public-surface)] px-4 py-3 shadow-xl sm:block lg:-right-5"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-xl dark:bg-emerald-950/50">✨</span><span><span className="block text-xs text-[var(--public-muted)]">{text.momentum}</span><span className="block text-sm font-extrabold text-[var(--public-text)]">{text.lookingGood}</span></span></div></div>
        </div>
      </section>

      <section id="features" className="relative border-y border-white/80 bg-white/75 py-20 sm:py-24 dark:border-slate-800 dark:bg-slate-950/45">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="mx-auto max-w-2xl text-center"><span className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600 dark:text-sky-300">{text.featuresEyebrow}</span><h2 className="mt-4 text-3xl font-black tracking-tight text-[var(--public-text)] sm:text-4xl">{text.featuresTitle}</h2><p className="mt-4 leading-7 text-[var(--public-muted)]">{text.featuresIntro}</p></div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {text.features.map((feature) => <article key={feature[1]} className="group rounded-[1.75rem] border border-slate-200/75 bg-white/90 p-6 shadow-[0_14px_40px_-30px_rgba(15,23,42,0.28)] transition duration-300 hover:-translate-y-1.5 hover:border-sky-200 hover:shadow-[0_24px_60px_-32px_rgba(37,99,235,0.32)] dark:border-slate-700 dark:bg-slate-900/85 dark:hover:border-sky-800"><div className={'flex h-12 w-12 items-center justify-center rounded-2xl text-2xl ' + feature[3].split(' ')[0]} aria-hidden="true">{feature[0]}</div><h3 className="mt-5 text-lg font-extrabold text-[var(--public-text)]">{feature[1]}</h3><p className="mt-2 text-sm leading-6 text-[var(--public-muted)]">{feature[2]}</p></article>)}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20 text-center sm:px-8 sm:py-24"><div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-950 via-blue-950 to-blue-700 px-6 py-12 text-white shadow-[0_30px_90px_-40px_rgba(30,64,175,0.5)] sm:px-12 sm:py-16"><div className="text-4xl" aria-hidden="true">🚀</div><h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">{text.bottomTitle}</h2><p className="mx-auto mt-4 max-w-xl leading-7 text-blue-50">{text.bottomBody}</p><Link href="/login?mode=register" className="mt-8 inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-7 py-3.5 text-sm font-extrabold text-blue-700 shadow-lg transition hover:-translate-y-0.5 hover:bg-blue-50">{text.bottomCta} <span aria-hidden="true">→</span></Link></div></section>
      <footer className="border-t border-[var(--public-border)] bg-[var(--public-surface)]/70 px-5 py-7 text-center text-sm text-[var(--public-muted)]">© 2026 EksplorinAja · {text.footer}</footer>
    </main>
  );
}
