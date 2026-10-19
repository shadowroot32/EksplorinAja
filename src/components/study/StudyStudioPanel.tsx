'use client';

import { useMemo, useState } from 'react';

type StudioFormat = 'report' | 'slides' | 'infographic' | 'storyboard';

interface StudyStudioPanelProps {
  title: string;
  summary: string;
  sourceContent: string;
  locale: 'id' | 'en';
  stats: { flashcards: number; dueCards: number; questions: number };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character] ?? character);
}

function splitSections(content: string) {
  return content.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean).slice(0, 60);
}

function formatText(value: string) {
  return escapeHtml(value.replace(/^#{1,6}\s+/, '').replace(/^[-*+]\s+/, ''));
}

function makeDocument(format: StudioFormat, title: string, summary: string, sourceContent: string, locale: 'id' | 'en', stats: StudyStudioPanelProps['stats']) {
  const sections = splitSections(sourceContent);
  const summaryText = summary.trim() || (locale === 'id' ? 'Ringkasan belum tersedia.' : 'No summary available yet.');
  const heading = locale === 'id' ? {
    report: 'Laporan belajar', slides: 'Presentasi belajar', infographic: 'Infografik belajar', storyboard: 'Storyboard video',
    summary: 'Ringkasan', source: 'Materi sumber', flashcards: 'Kartu belajar', due: 'Perlu ditinjau', questions: 'Soal kuis',
    scene: 'Adegan', narration: 'Narasi', note: 'Dokumen ini dibuat lokal dari materi belajar yang tersedia di EksplorinAja.',
  } : {
    report: 'Study report', slides: 'Study presentation', infographic: 'Study infographic', storyboard: 'Video storyboard',
    summary: 'Summary', source: 'Source material', flashcards: 'Flashcards', due: 'Due for review', questions: 'Quiz questions',
    scene: 'Scene', narration: 'Narration', note: 'Generated locally from study material available in EksplorinAja.',
  };
  const safeTitle = escapeHtml(title);
  const summaryHtml = summaryText.split(/\n\s*\n/).filter(Boolean).map((p) => '<p>' + formatText(p) + '</p>').join('');
  const sectionHtml = sections.map((section, index) => {
    const isHeading = /^#{1,6}\s+/.test(section);
    const text = formatText(section);
    return format === 'slides'
      ? '<section class="slide"><small>' + String(index + 1).padStart(2, '0') + '</small><h2>' + (isHeading ? text : escapeHtml(section.length > 80 ? section.slice(0, 80) + '…' : section)) + '</h2>' + (!isHeading ? '<p>' + text + '</p>' : '') + '</section>'
      : format === 'infographic'
        ? '<article class="tile"><span>' + String(index + 1).padStart(2, '0') + '</span><p>' + text + '</p></article>'
        : '<section><h2>' + (isHeading ? text : escapeHtml(heading.source)) + '</h2><p>' + text + '</p></section>';
  }).join('');
  let body = '';
  if (format === 'slides') {
    body = '<header class="slide cover"><small>EksplorinAja</small><h1>' + safeTitle + '</h1><h2>' + escapeHtml(heading.summary) + '</h2>' + summaryHtml + '</header>' + sectionHtml;
  } else if (format === 'infographic') {
    body = '<header><small>EksplorinAja · INFOGRAPHIC</small><h1>' + safeTitle + '</h1><div class="summary">' + summaryHtml + '</div></header><div class="tiles">' + sectionHtml + '</div>';
  } else if (format === 'storyboard') {
    body = '<header><small>EksplorinAja</small><h1>' + safeTitle + '</h1><h2>' + escapeHtml(heading.storyboard) + '</h2></header>' +
      sections.map((section, index) => '<article class="scene"><h2>' + escapeHtml(heading.scene) + ' ' + (index + 1) + '</h2><p><b>' + escapeHtml(heading.narration) + ':</b> ' + formatText(section) + '</p><p class="visual">Visual: ' + formatText(section.slice(0, 180)) + '</p></article>').join('');
  } else {
    body = '<header><small>EksplorinAja · REPORT</small><h1>' + safeTitle + '</h1><p class="muted">' + escapeHtml(heading.note) + '</p></header><section class="stats"><article><b>' + stats.flashcards + '</b><span>' + escapeHtml(heading.flashcards) + '</span></article><article><b>' + stats.dueCards + '</b><span>' + escapeHtml(heading.due) + '</span></article><article><b>' + stats.questions + '</b><span>' + escapeHtml(heading.questions) + '</span></article></section><section><h2>' + escapeHtml(heading.summary) + '</h2>' + summaryHtml + '</section><section><h2>' + escapeHtml(heading.source) + '</h2>' + sectionHtml + '</section>';
  }
  const documentTitle = format === 'report' ? heading.report : format === 'slides' ? heading.slides : format === 'infographic' ? heading.infographic : heading.storyboard;
  const css = format === 'slides'
    ? 'body{background:#101827;color:#f8fafc}.slide{min-height:85vh;display:flex;flex-direction:column;justify-content:center;page-break-after:always;background:#172554;border-radius:24px;padding:8vw;margin:0 0 24px}.slide h2{font-size:clamp(2rem,5vw,4rem)}.slide p{font-size:1.4rem;line-height:1.7}.cover{background:#1d4ed8}'
    : format === 'infographic'
      ? '.tiles{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.tile{border:1px solid #cbd5e1;border-radius:18px;padding:20px;background:#f8fafc;break-inside:avoid}.tile span{color:#2563eb;font-weight:800}.tile p{font-size:1.1rem}'
      : 'section{margin:28px 0}section h2{border-bottom:2px solid #dbeafe;padding-bottom:8px}.stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.stats article{background:#eff6ff;padding:18px;border-radius:14px;display:flex;flex-direction:column}.stats b{font-size:2rem;color:#1d4ed8}.stats span{font-size:.9rem}.scene{padding:18px;border:1px solid #cbd5e1;border-radius:14px;margin:16px 0}.visual{background:#f1f5f9;padding:12px;border-radius:8px;color:#334155}';
  return '<!doctype html><html lang="' + locale + '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + escapeHtml(documentTitle + ': ' + title) + '</title><style>*{box-sizing:border-box}body{font-family:Inter,ui-sans-serif,system-ui,sans-serif;max-width:1000px;margin:0 auto;padding:28px;line-height:1.65;color:#0f172a;background:#fff}h1{font-size:clamp(2rem,5vw,3.5rem);line-height:1.1}h2{font-size:1.4rem}header{padding:20px 0 28px}header small{font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#2563eb}.muted{color:#64748b}p{white-space:pre-wrap;overflow-wrap:anywhere}.summary{font-size:1.1rem}' + css + '@media(max-width:600px){body{padding:16px}.tiles,.stats{grid-template-columns:1fr}}@media print{body{max-width:none;padding:0}.slide{border-radius:0;margin:0;min-height:95vh}.tile{break-inside:avoid}button{display:none}}</style></head><body><main><h1 class="sr-only">' + escapeHtml(documentTitle) + '</h1>' + body + '</main><script>window.addEventListener("keydown",function(e){if(e.key==="ArrowRight")window.scrollBy({top:window.innerHeight,behavior:"smooth"});if(e.key==="ArrowLeft")window.scrollBy({top:-window.innerHeight,behavior:"smooth"});});</script></body></html>';
}

export default function StudyStudioPanel({ title, summary, sourceContent, locale, stats }: StudyStudioPanelProps) {
  const [notice, setNotice] = useState('');
  const sections = useMemo(() => splitSections(sourceContent), [sourceContent]);

  function download(format: StudioFormat) {
    const html = makeDocument(format, title, summary, sourceContent, locale, stats);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'eksplorinaja-' + format + '.html';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice(locale === 'id' ? 'File HTML berhasil dibuat di perangkatmu. Buka file lalu gunakan Cetak → Simpan sebagai PDF bila diperlukan.' : 'HTML file created on your device. Open it and use Print → Save as PDF if needed.');
  }

  const options: { format: StudioFormat; title: string; description: string }[] = locale === 'id' ? [
    { format: 'report', title: 'Laporan belajar', description: 'Ringkasan, materi, dan statistik belajar dalam dokumen siap cetak.' },
    { format: 'slides', title: 'Slide presentasi', description: 'Materi dibagi menjadi slide HTML yang bisa dibuka dan dicetak.' },
    { format: 'infographic', title: 'Infografik', description: 'Poin materi disusun menjadi kartu visual yang responsif.' },
    { format: 'storyboard', title: 'Storyboard video', description: 'Susunan adegan dan narasi untuk dipakai saat membuat video.' },
  ] : [
    { format: 'report', title: 'Study report', description: 'Summary, source material, and study stats in a print-ready document.' },
    { format: 'slides', title: 'Presentation slides', description: 'Source material split into a standalone HTML slide deck.' },
    { format: 'infographic', title: 'Infographic', description: 'Key material arranged as responsive visual cards.' },
    { format: 'storyboard', title: 'Video storyboard', description: 'Scene and narration outline to use when producing a video.' },
  ];

  return <section className="space-y-5">
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-300">EksplorinAja Studio</p>
      <h2 className="mt-1 text-xl font-semibold text-white sm:text-2xl">{locale === 'id' ? 'Ubah materi menjadi output belajar' : 'Turn study material into learning outputs'}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-400">{locale === 'id' ? 'Buat file lokal tanpa layanan berbayar. File HTML bisa dibuka offline dan dicetak ke PDF.' : 'Create local files without paid services. HTML files can be opened offline and printed to PDF.'}</p>
    </div>
    <div className="grid gap-4 sm:grid-cols-2">
      {options.map((option) => <article key={option.format} className="flex min-w-0 flex-col rounded-2xl border border-slate-700 bg-[#0f1829] p-5">
        <h3 className="font-bold text-slate-100">{option.title}</h3>
        <p className="mt-2 flex-1 text-sm leading-6 text-slate-400">{option.description}</p>
        <button type="button" onClick={() => download(option.format)} disabled={!sourceContent.trim() && !summary.trim()} className="mt-4 rounded-xl border border-slate-600 px-4 py-2.5 text-sm font-bold text-slate-100 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">{locale === 'id' ? 'Unduh HTML' : 'Download HTML'}</button>
      </article>)}
    </div>
    {notice && <p role="status" className="rounded-xl border border-emerald-900 bg-emerald-950/40 p-3 text-sm text-emerald-200">{notice}</p>}
    <p className="text-xs text-slate-500">{locale === 'id' ? 'Materi dibagi menjadi ' + sections.length + ' bagian untuk penyusunan output. Video dan audio MP4/MP3 tidak dirender oleh fitur ini; gunakan storyboard sebagai naskah produksi. Podcast dengan pembacaan suara tersedia di tab Podcast.' : 'Material is split into ' + sections.length + ' sections. This tool does not render MP4/MP3; use the storyboard as a production script. Podcast speech playback is available in the Podcast tab.'}</p>
  </section>;
}
