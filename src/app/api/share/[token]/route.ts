import { and, eq, gt, isNull } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { studySetShares, studySets } from '@/lib/db/schema';
import { hashShareToken, isValidShareToken } from '@/lib/feature-utils';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!isValidShareToken(token)) return NextResponse.json({ error: 'Share link not found or expired' }, { status: 404 });
  const [share] = await db.select({
    title: studySets.title,
    sourceType: studySets.sourceType,
    sourceContent: studySets.sourceContent,
    summary: studySets.summary,
    createdAt: studySets.createdAt,
    expiresAt: studySetShares.expiresAt,
  }).from(studySetShares)
    .innerJoin(studySets, eq(studySetShares.studySetId, studySets.id))
    .where(and(
      eq(studySetShares.tokenHash, hashShareToken(token)),
      isNull(studySetShares.revokedAt),
      gt(studySetShares.expiresAt, new Date()),
    ))
    .limit(1);
  if (!share) return NextResponse.json({ error: 'Share link not found or expired' }, { status: 404 });
  return NextResponse.json({ document: share });
}
