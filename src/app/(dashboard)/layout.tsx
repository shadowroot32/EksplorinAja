import Navbar from '@/components/layout/Navbar';

export const instant = false;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-sky-50 dark:bg-[#0b1220]">
      <Navbar />
      <main className="dashboard-main min-h-screen px-4 pb-28 pt-20 sm:px-6 lg:ml-64 lg:px-10 lg:pb-12 lg:pt-20 xl:px-12">
        <div className="mx-auto w-full max-w-[1440px]">{children}</div>
      </main>
    </div>
  );
}
