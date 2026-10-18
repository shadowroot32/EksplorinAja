import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { quizItems } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const rows = await db.select().from(quizItems).where(eq(quizItems.studySetId, id));
  return NextResponse.json(rows);
}
