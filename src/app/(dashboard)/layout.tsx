import Navbar from '@/components/layout/Navbar';

export const instant = false;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 pt-20 pb-10">{children}</main>
    </div>
  );
}
