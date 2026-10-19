export interface DocumentBlock {
  id: string;
  type: 'heading' | 'paragraph' | 'listItem';
  text: string;
  marker?: string;
}

const headingNoiseCharacters = /[^\p{L}\p{N}\s.,:;!?'"“”‘’()[\]{}&/+\-–—]/gu;

function isCleanHeading(text: string): boolean {
  const value = text.trim();
  if (!value || value.length > 120) return false;
  if (/[.!]$/.test(value)) return false;

  const visible = value.replace(/\s/g, '');
  if (!visible) return false;
  const noiseCount = (visible.match(headingNoiseCharacters) ?? []).length;
  if (noiseCount / visible.length > 0.06) return false;

  const words = value.match(/\p{L}[\p{L}\p{N}'’\-–]*\p{L}|\p{L}/gu) ?? [];
  if (words.length < 2 || words.length > 14) return false;

  // Strong heading signals: explicit markdown, a numbered section, all-caps title,
  // or normal title-case phrasing. This intentionally avoids treating arbitrary
  // short OCR fragments as headings.
  const letters = value.match(/\p{L}/gu) ?? [];
  if (letters.length < 4) return false;
  const upperLetters = value.match(/\p{Lu}/gu) ?? [];
  const allCapsRatio = upperLetters.length / letters.length;
  const titleCaseWords = words.filter((word) => /^\p{Lu}/u.test(word)).length;
  const titleCaseRatio = titleCaseWords / words.length;
  const looksTitleCase = titleCaseRatio >= 0.6 && !/[?]$/.test(value);
  const looksAllCaps = allCapsRatio >= 0.8 && words.length <= 12;
  const hasSentenceNoise = /[=|_]{2,}|[®©™]/.test(value);

  return !hasSentenceNoise && (looksTitleCase || looksAllCaps || /[?:]$/.test(value));
}

function headingBlock(text: string, index: number): DocumentBlock {
  return { id: 'document-section-' + index, type: 'heading', text: text.replace(/^#{1,3}\s+/, '').trim() };
}

export function buildDocumentBlocks(content: string): DocumentBlock[] {
  const normalized = content
    .replace(/\r\n?/g, '\n')
    .replace(/\f/g, '\n\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const blocks: DocumentBlock[] = [];
  let paragraphLines: string[] = [];

  const flushParagraph = () => {
    const text = paragraphLines.map((line) => line.trim()).filter(Boolean).join(' ').replace(/\s{2,}/g, ' ').trim();
    if (text) blocks.push({ id: 'document-section-' + blocks.length, type: 'paragraph', text });
    paragraphLines = [];
  };

  for (const rawLine of normalized.split('\n')) {
    const line = rawLine.trim().replace(/[ \t]{2,}/g, ' ');
    if (!line) {
      flushParagraph();
      continue;
    }

    const markdownHeading = line.match(/^#{1,3}\s+(.+)$/);
    if (markdownHeading) {
      flushParagraph();
      blocks.push(headingBlock(markdownHeading[1], blocks.length));
      continue;
    }

    const numbered = line.match(/^(\d+(?:\.\d+)*[.)]?)\s+(.+)$/);
    const numberedText = numbered?.[2]?.trim();
    const numberedHeading = Boolean(numbered && numberedText && isCleanHeading(numberedText) && line.length <= 140);
    if (numberedHeading) {
      flushParagraph();
      blocks.push(headingBlock(line, blocks.length));
      continue;
    }

    const listItem = line.match(/^([•●▪◦‣*-]|\d{1,2}[.)])\s+(.+)$/);
    if (listItem) {
      flushParagraph();
      blocks.push({
        id: 'document-section-' + blocks.length,
        type: 'listItem',
        marker: listItem[1],
        text: listItem[2].trim(),
      });
      continue;
    }

    if (isCleanHeading(line)) {
      flushParagraph();
      blocks.push(headingBlock(line, blocks.length));
      continue;
    }

    paragraphLines.push(line);
  }

  flushParagraph();
  return blocks;
}
