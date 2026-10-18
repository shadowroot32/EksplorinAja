import { Suspense } from 'react';
import SharedDocumentClient from './SharedDocumentClient';

export default function SharedDocumentPage({ params }: { params: Promise<{ token: string }> }) {
  return (
    <Suspense fallback={<main className="min-h-screen bg-sky-50 px-4 py-10 text-center text-slate-500">Loading shared document…</main>}>
      <SharedDocumentClient params={params} />
    </Suspense>
  );
}
