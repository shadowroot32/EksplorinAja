'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: '🏠' },
  { href: '/subjects', label: 'Subjects', icon: '📚' },
  { href: '/library', label: 'Library', icon: '🗂️' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
        <Link href="/dashboard" className="text-emerald-400 font-bold text-lg">Cendekia.ai</Link>
        <div className="flex items-center gap-1">
          {nav.map(item => (
            <Link key={item.href} href={item.href}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                pathname.startsWith(item.href)
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800',
              )}>
              <span className="mr-1.5">{item.icon}</span>{item.label}
            </Link>
          ))}
          <button onClick={logout} className="ml-2 px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors">
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}
