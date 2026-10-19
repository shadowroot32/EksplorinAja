import ThemeLanguageControls from '@/components/layout/ThemeLanguageControls';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="public-auth-shell relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--public-bg)] px-4 pb-8 pt-24 transition-colors duration-300 sm:px-8 sm:pb-10">
      <div aria-hidden="true" className="pointer-events-none absolute -left-28 top-12 h-72 w-72 rounded-full bg-sky-400/10 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-indigo-400/10 blur-3xl" />
      <div className="absolute right-4 top-4 z-50 sm:right-6 sm:top-5">
        <div className="hidden sm:block"><ThemeLanguageControls /></div>
        <div className="sm:hidden"><ThemeLanguageControls compact /></div>
      </div>
      <div className="relative z-10 w-full">{children}</div>
    </div>
  );
}
