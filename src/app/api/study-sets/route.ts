import { randomUUID } from 'crypto';
import { and, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { activities, flashcards, quizItems, studySets, subjects } from '@/lib/db/schema';
import { getSession } from '@/lib/auth';
import {
  extractPDF,
  extractYouTube,
  generateFlashcards,
  generateQuiz,
  generateSummary,
  AIRequestTimeoutError,
  InvalidAIOutputError,
  PDFOCRNoTextError,
  PDFOCRTimeoutError,
  PDFOCRUnavailableError,
} from '@/lib/ai/engine';
import {
  getPdfUploadError,
  hasPdfSignature,
  MAX_SOURCE_CHARS,
  textStudySetSchema,
  youtubeStudySetSchema,
} from '@/lib/ai/material-validation';

export const maxDuration = 90;

const pdfTitleSchema = z.object({
  title: z.string().trim().min(1).max(200),
  subjectId: z.string().trim().min(1).max(200).optional(),
});

function inputError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const rows = await db.select().from(studySets).where(eq(studySets.userId, user.id));
  return NextResponse.json(rows, { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const contentType = req.headers.get('content-type') ?? '';
  let title = '';
  let subjectId: string | undefined;
  let sourceType: 'pdf' | 'youtube' | 'text';
  let content = '';

  if (contentType.includes('multipart/form-data')) {
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return inputError('Format unggahan tidak valid.');
    }

    const candidate = form.get('file');
    if (!(candidate instanceof File)) return inputError('Pilih file PDF yang akan diunggah.');
    const file = candidate;
    const metadataError = getPdfUploadError({ name: file.name, size: file.size, type: file.type });
    if (metadataError === 'file_too_large') {
      return inputError('Ukuran PDF maksimal 4 MB.', 413);
    }
    if (metadataError === 'empty_file') return inputError('File PDF kosong.', 400);
    if (metadataError) return inputError('File harus berformat PDF.', 415);

    const titleValue = String(form.get('title') ?? '').trim() || file.name.replace(/\.pdf$/i, '').trim();
    const subjectValue = String(form.get('subjectId') ?? '').trim();
    const parsedPdf = pdfTitleSchema.safeParse({
      title: titleValue,
      ...(subjectValue ? { subjectId: subjectValue } : {}),
    });
    if (!parsedPdf.success) return inputError('Judul materi tidak valid.', 400);
    title = parsedPdf.data.title;
    subjectId = parsedPdf.data.subjectId;
    sourceType = 'pdf';

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!hasPdfSignature(buffer)) return inputError('File tidak memiliki header PDF yang valid.', 415);
    try {
      content = await extractPDF(buffer);
    } catch (error) {
      console.error('[STUDY SETS] PDF extraction failed:', error instanceof Error ? error.name : 'unknown error');
      if (error instanceof PDFOCRTimeoutError) {
        return inputError('OCR PDF scan terlalu lama. Coba PDF yang lebih pendek atau pecah dokumen menjadi beberapa bagian.', 504);
      }
      if (error instanceof PDFOCRUnavailableError) {
        return inputError('PDF tampaknya berupa scan, tetapi layanan OCR belum tersedia. Coba lagi nanti atau hubungi administrator aplikasi.', 503);
      }
      if (error instanceof PDFOCRNoTextError) {
        return inputError('Teks PDF tidak berhasil dikenali. Pastikan halaman cukup jelas dan tidak terlalu buram.', 422);
      }
      return inputError('PDF tidak dapat dibaca. Pastikan PDF tidak rusak atau dilindungi kata sandi.', 422);
    }
  } else {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return inputError('Body request harus berupa JSON object.', 400);
    }

    if (body.sourceType === 'youtube') {
      const parsed = youtubeStudySetSchema.safeParse(body);
      if (!parsed.success) return inputError('URL, judul, atau subjek YouTube tidak valid.', 400);
      title = parsed.data.title;
      subjectId = parsed.data.subjectId;
      sourceType = 'youtube';
      try {
        content = await extractYouTube(parsed.data.url);
      } catch (error) {
        console.error('[STUDY SETS] YouTube transcript extraction failed:', error instanceof Error ? error.name : 'unknown error');
        return inputError('Transkrip YouTube tidak tersedia. Periksa tautan atau coba lagi nanti.', 422);
      }
    } else {
      const parsed = textStudySetSchema.safeParse(body);
      if (!parsed.success) return inputError('Judul atau isi materi teks tidak valid (isi 10–60.000 karakter).', 400);
      title = parsed.data.title;
      subjectId = parsed.data.subjectId;
      sourceType = 'text';
      content = parsed.data.content;
    }
  }

  const normalizedContent = content.trim();
  if (normalizedContent.length < 10) {
    return inputError('Sumber tidak berisi teks yang cukup untuk membuat materi belajar.', 422);
  }
  if (normalizedContent.length > MAX_SOURCE_CHARS) {
    return inputError('Teks hasil ekstraksi terlalu panjang (maksimal 60.000 karakter). Pecah materi menjadi beberapa bagian.', 413);
  }
  content = normalizedContent;

  if (subjectId) {
    const [subject] = await db.select({ id: subjects.id })
      .from(subjects)
      .where(and(eq(subjects.id, subjectId), eq(subjects.userId, user.id)))
      .limit(1);
    if (!subject) return inputError('Subjek tidak ditemukan.', 404);
  }

  let summary: string;
  let cards: { front: string; back: string }[];
  let quiz: { question: string; options: string[]; correctIndex: number; explanation: string }[];

  try {
    // Sequential calls cap provider concurrency and keep the total request inside maxDuration.
    summary = await generateSummary(content);
    cards = await generateFlashcards(content);
    quiz = await generateQuiz(content);
  } catch (error) {
    if (error instanceof AIRequestTimeoutError) {
      return inputError('Pembuatan materi terlalu lama. Coba sumber yang lebih pendek atau ulangi beberapa saat lagi.', 504);
    }
    if (error instanceof InvalidAIOutputError) {
      console.error('[STUDY SETS] AI output failed validation.');
      return inputError('AI menghasilkan materi dengan format tidak valid. Coba buat ulang materi.', 502);
    }
    console.error('[STUDY SETS] AI generation failed:', error instanceof Error ? error.name : 'unknown error');
    return inputError('Layanan AI gagal membuat materi. Coba lagi nanti.', 502);
  }

  const setId = randomUUID();
  const [row] = await db.transaction(async (tx) => {
    const [createdSet] = await tx.insert(studySets).values({
      id: setId,
      userId: user.id,
      subjectId: subjectId ?? null,
      title,
      sourceType,
      sourceContent: content,
      summary,
    }).returning();

    await tx.insert(flashcards).values(cards.map((card) => ({
      id: randomUUID(),
      studySetId: setId,
      front: card.front,
      back: card.back,
    })));

    await tx.insert(quizItems).values(quiz.map((item) => ({
      id: randomUUID(),
      studySetId: setId,
      question: item.question,
      options: item.options,
      correctIndex: item.correctIndex,
      explanation: item.explanation,
    })));

    await tx.insert(activities).values({
      id: randomUUID(),
      userId: user.id,
      activityType: 'study_set_created',
      description: `Created study set "${title}"`,
    });

    return [createdSet];
  });

  return NextResponse.json(row, { status: 201 });
}
