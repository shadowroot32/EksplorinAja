'use client';

import { use, useEffect, useMemo, useState } from 'react';
import FlashcardViewer from '@/components/study/FlashcardViewer';
import QuizPlayer from '@/components/study/QuizPlayer';
import CornellNotesPanel from '@/components/study/CornellNotesPanel';
import MindMapPanel from '@/components/study/MindMapPanel';
import PodcastPanel from '@/components/study/PodcastPanel';
import ShareDocumentButton from '@/components/study/ShareDocumentButton';

type WorkspaceTab = 'document' | 'summaries' | 'notes' | 'flashcards' | 'mindmap' | 'artifacts';
type ArtifactTab = 'quiz' | 'podcast';
interface StudySet {
  id: string;
  title: string;
  summary: string;
  sourceType: string;
  sourceContent: string;
  createdAt: string;
}
interface WorkspaceStats {
  flashcards: number;
  dueCards: number;
  questions: number;
}
interface DocumentBlock {
  id: string;
  type: 'heading' | 'paragraph';
  text: string;
}

function buildDocumentBlocks(content: string): DocumentBlock[] {
  return content
    .replace(/\r\n/g, '\n')
    .split(/\n[ \t]*\n+/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block, index) => {
      const markdownHeading = block.match(/^#{1,3}\s+(.+)$/);
      const isNumberedHeading = block.length < 140
        && /^(?:(?:\d+(?:\.\d+)*[.)]?)|(?:bab\s+\w+))\s+\S+/i.test(block);
      const isShortHeading = block.length <= 72
        && block.split(/\s+/).length <= 10
        && !/[.!?]$/.test(block)
        && !/[,;]/.test(block);
      const type = markdownHeading || isNumberedHeading || isShortHeading ? 'heading' : 'paragraph';
      return {
        id: 'document-section-' + index,
        type,
        text: markdownHeading ? markdownHeading[1].trim() : block,
      };
    });
}

function formattedDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Recently added'
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

const tabs: { key: WorkspaceTab; label: string; icon: string }[] = [
  { key: 'document', label: 'Document', icon: '▤' },
  { key: 'summaries', label: 'Summaries', icon: '✧' },
  { key: 'notes', label: 'Notes', icon: '▧' },
  { key: 'flashcards', label: 'Flashcards', icon: '▣' },
  { key: 'mindmap', label: 'Mind Map', icon: '⌘' },
  { key: 'artifacts', label: 'Artifacts', icon: '◇' },
];

export default function StudyClient({ paramsPromise }: { paramsPromise: Promise<{ setId: string }> }) {
  const { setId } = use(paramsPromise);
  const [set, setSet] = useState<StudySet | null>(null);
  const [tab, setTab] = useState<WorkspaceTab>('document');
  const [artifactTab, setArtifactTab] = useState<ArtifactTab>('quiz');
  const [focus, setFocus] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [stats, setStats] = useState<WorkspaceStats>({ flashcards: 0, dueCards: 0, questions: 0 });
  const [isEditing, setIsEditing] = useState(false);
  const [aiEditOpen, setAiEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [aiInstruction, setAiInstruction] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [editNotice, setEditNotice] = useState('');
  const [copyStatus, setCopyStatus] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setLoadError('');
      try {
        const response = await fetch('/api/study-sets/' + setId, { cache: 'no-store' });
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.id) throw new Error(payload?.error || 'Study document could not be loaded.');
        if (cancelled) return;
        setSet(payload as StudySet);
        setEditTitle(payload.title ?? '');
        setEditContent(payload.sourceContent ?? '');
      } catch {
        if (!cancelled) setLoadError('Study document could not be loaded. Refresh the page and try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [setId]);

  useEffect(() => {
    let cancelled = false;
    async function loadStats() {
      try {
        const [cardsResponse, quizResponse] = await Promise.all([
          fetch('/api/study-sets/' + setId + '/flashcards', { cache: 'no-store' }),
          fetch('/api/study-sets/' + setId + '/quiz', { cache: 'no-store' }),
        ]);
        const [cards, questions] = await Promise.all([
          cardsResponse.ok ? cardsResponse.json() : [],
          quizResponse.ok ? quizResponse.json() : [],
        ]);
        if (cancelled) return;
        const now = Date.now();
        const safeCards = Array.isArray(cards) ? cards : [];
        setStats({
          flashcards: safeCards.length,
          dueCards: safeCards.filter((card: { dueDate?: string }) => !card.dueDate || new Date(card.dueDate).getTime() <= now).length,
          questions: Array.isArray(questions) ? questions.length : 0,
        });
      } catch {
        // Counts are supplementary; the study tabs still fetch their own data and show errors.
      }
    }
    void loadStats();
    return () => { cancelled = true; };
  }, [setId]);

  const documentBlocks = useMemo(() => buildDocumentBlocks(set?.sourceContent ?? ''), [set?.sourceContent]);
  const outline = documentBlocks.filter((block) => block.type === 'heading');
  const readingMinutes = Math.max(1, Math.ceil((set?.sourceContent.trim().split(/\s+/).filter(Boolean).length ?? 0) / 200));

  async function copySummary() {
    if (!set?.summary) return;
    try {
      await navigator.clipboard.writeText(set.summary);
      setCopyStatus('Summary copied');
    } catch {
      setCopyStatus('Copy is unavailable in this browser');
    }
    window.setTimeout(() => setCopyStatus(''), 2500);
  }

  function openEditor(withAI: boolean) {
    if (!set) return;
    setEditTitle(set.title);
    setEditContent(set.sourceContent);
    setAiInstruction('');
    setEditError('');
    setEditNotice('');
    setAiEditOpen(withAI);
    setIsEditing(true);
  }

  function cancelEditor() {
    setIsEditing(false);
    setAiEditOpen(false);
    setEditError('');
    if (set) {
      setEditTitle(set.title);
      setEditContent(set.sourceContent);
    }
  }

  async function generateRevision() {
    if (aiInstruction.trim().length < 3 || aiGenerating) return;
    setAiGenerating(true);
    setEditError('');
    setEditNotice('');
    try {
      const response = await fetch('/api/study-sets/' + setId + '/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instruction: aiInstruction, sourceContent: editContent }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || typeof payload.content !== 'string') throw new Error(payload.error || 'AI could not revise the document.');
      setEditContent(payload.content);
      setEditNotice('AI revision is ready. Review it below before saving.');
    } catch (error) {
      setEditError(error instanceof Error ? error.message : 'AI could not revise the document.');
    } finally {
      setAiGenerating(false);
    }
  }

  async function saveDocument() {
    if (!set || saving) return;
    setSaving(true);
    setEditError('');
    setEditNotice('');
    try {
      const response = await fetch('/api/study-sets/' + setId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle, sourceContent: editContent }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.id) throw new Error(payload.error || 'Document changes could not be saved.');
      setSet(payload as StudySet);
      setIsEditing(false);
      setAiEditOpen(false);
      setEditNotice('');
      setCopyStatus('');
    } catch (error) {
      setEditError(error instanceof Error ? error.message : 'Document changes could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="rounded-3xl border border-slate-800 bg-[#0b1220] py-24 text-center text-slate-400">Loading learning workspace…</div>;
  if (loadError || !set) return (
    <div className="rounded-3xl border border-rose-900/60 bg-[#0b1220] p-8 text-rose-200">
      <h1 className="text-xl font-bold">Workspace unavailable</h1>
      <p role="alert" className="mt-2 text-sm">{loadError || 'The study set was not found.'}</p>
    </div>
  );

  const tagWords = set.title.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 2).slice(0, 2);
  const tags = [...tagWords, set.sourceType, 'study material'];
  const outerClass = focus
    ? 'fixed inset-0 z-[100] h-[100dvh] w-screen overflow-y-auto rounded-none bg-[#0b1220] p-3 text-slate-100 sm:p-6'
    : 'rounded-3xl border border-slate-800 bg-[#0b1220] p-3 text-slate-100 shadow-xl sm:p-5';

  return (
    <div className={outerClass}>
      <div className="mx-auto w-full max-w-[1600px] space-y-5">
        <header className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-300">Learning workspace</p>
            <h1 className="mt-2 break-words text-2xl font-bold tracking-tight text-slate-50 sm:text-3xl">{set.title}</h1>
            <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-400">
              <span className="capitalize">{set.sourceType}</span>
              <span aria-hidden="true">·</span>
              <span>{readingMinutes} min read</span>
              <span aria-hidden="true">·</span>
              <span>{formattedDate(set.createdAt)}</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm">
              <span className="font-bold text-slate-100">{stats.dueCards}</span>
              <span className="ml-1.5 text-slate-400">cards due</span>
            </div>
            <button type="button" onClick={() => { setTab('artifacts'); setArtifactTab('quiz'); }} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800">
              Quizzes <span className="ml-1 rounded-md bg-slate-800 px-1.5 py-0.5 text-xs text-slate-300">{stats.questions}</span>
            </button>
            <button type="button" onClick={() => setFocus((value) => !value)} className="rounded-xl border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800" aria-pressed={focus}>
              {focus ? '↙ Exit focus' : '⛶ Focus'}
            </button>
          </div>
        </header>

        <nav aria-label="Study workspace tabs" className="flex gap-1.5 overflow-x-auto rounded-2xl bg-slate-800/90 p-1.5">
          {tabs.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              aria-current={tab === item.key ? 'page' : undefined}
              className={'flex min-w-max flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ' + (
                tab === item.key ? 'bg-[#0b1220] text-white shadow-sm' : 'text-slate-300 hover:bg-slate-700/70 hover:text-white'
              )}
            >
              <span aria-hidden="true" className="text-base">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <main className="min-w-0">
          {tab === 'document' && (
            <section className="overflow-hidden rounded-2xl border border-slate-700 bg-[#0f1829]">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700 px-4 py-3 sm:px-6">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Original study document</span>
                <div className="flex flex-wrap gap-2">
                  {!isEditing && <button type="button" onClick={() => openEditor(true)} className="rounded-xl border border-sky-800/80 bg-slate-900 px-3 py-2 text-sm font-semibold text-sky-200 transition hover:bg-slate-800">✧ Edit with AI</button>}
                  {!isEditing && <button type="button" onClick={() => openEditor(false)} className="rounded-xl border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800">✎ Edit</button>}
                </div>
              </div>

              {isEditing ? (
                <div className="space-y-4 p-4 sm:p-6">
                  {aiEditOpen && (
                    <div className="space-y-3 rounded-2xl border border-sky-900 bg-slate-900 p-4">
                      <div>
                        <h2 className="font-semibold text-slate-100">Edit with AI</h2>
                        <p className="mt-1 text-sm text-slate-400">Describe how you want to revise this document. AI prepares a draft; it will not be saved until you apply it.</p>
                      </div>
                      <textarea value={aiInstruction} onChange={(event) => setAiInstruction(event.target.value)} maxLength={1000} rows={3} className="w-full resize-y rounded-xl border border-slate-700 bg-[#0b1220] p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none" placeholder="e.g. Simplify the wording for beginners while preserving all important technical terms." />
                      <button type="button" disabled={aiGenerating || aiInstruction.trim().length < 3} onClick={() => void generateRevision()} className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50">
                        {aiGenerating ? 'Revising document…' : 'Generate revision'}
                      </button>
                    </div>
                  )}
                  <label className="block space-y-2">
                    <span className="text-sm font-semibold text-slate-300">Document title</span>
                    <input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} maxLength={200} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none focus:border-sky-500" />
                  </label>
                  <label className="block space-y-2">
                    <span className="text-sm font-semibold text-slate-300">Document content</span>
                    <textarea value={editContent} onChange={(event) => setEditContent(event.target.value)} maxLength={60000} rows={18} className="w-full resize-y rounded-xl border border-slate-700 bg-slate-900 p-4 text-sm leading-7 text-slate-100 outline-none focus:border-sky-500" />
                    <span className="text-xs text-slate-500">{editContent.length.toLocaleString()} / 60,000 characters</span>
                  </label>
                  {editNotice && <p role="status" className="rounded-xl border border-emerald-900 bg-emerald-950/50 p-3 text-sm text-emerald-200">{editNotice}</p>}
                  {editError && <p role="alert" className="rounded-xl border border-rose-900 bg-rose-950/50 p-3 text-sm text-rose-200">{editError}</p>}
                  <p className="text-xs leading-5 text-amber-200/80">Saving changes updates the source document. Previously generated summaries, flashcards, and quizzes are not automatically regenerated.</p>
                  <div className="flex flex-wrap justify-end gap-2">
                    <button type="button" onClick={cancelEditor} disabled={saving || aiGenerating} className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-50">Cancel</button>
                    <button type="button" onClick={() => void saveDocument()} disabled={saving || aiGenerating || editTitle.trim().length === 0 || editContent.trim().length < 10} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-500 disabled:opacity-50">
                      {saving ? 'Saving…' : 'Save changes'}
                    </button>
                  </div>
                </div>
              ) : (
                <div id="document-scroll" className="max-h-[72vh] overflow-y-auto">
                  <div className="grid gap-8 p-5 sm:p-8 lg:grid-cols-[minmax(0,1fr)_240px] lg:gap-10 lg:p-10">
                    <article className="min-w-0">
                      <p className="text-sm font-medium text-sky-300">{set.sourceType === 'youtube' ? 'YouTube learning material' : set.sourceType === 'pdf' ? 'PDF learning material' : 'Study notes'}</p>
                      <h2 className="mt-4 break-words text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl">{set.title}</h2>
                      <p className="mt-4 text-sm text-slate-400">About {readingMinutes} minutes to read</p>
                      <hr className="my-8 border-slate-700" />
                      {!documentBlocks.length ? (
                        <p className="rounded-xl border border-dashed border-slate-700 p-6 text-sm text-slate-400">No source text is available for this study set.</p>
                      ) : (
                        <div className="space-y-5">
                          {documentBlocks.map((block) => block.type === 'heading' ? (
                            <h3 key={block.id} id={block.id} className="scroll-mt-6 break-words pt-2 text-xl font-semibold leading-relaxed text-slate-100 sm:text-2xl">{block.text}</h3>
                          ) : (
                            <p key={block.id} className="whitespace-pre-wrap break-words text-[15px] leading-8 text-slate-300 sm:text-base">{block.text}</p>
                          ))}
                        </div>
                      )}
                    </article>
                    {outline.length > 0 && (
                      <aside className="hidden lg:block">
                        <div className="sticky top-5 max-h-[65vh] overflow-y-auto border-l border-slate-700 pl-4">
                          <p className="mb-3 text-sm font-semibold text-slate-200">On this page</p>
                          <nav aria-label="Document outline" className="space-y-1">
                            {outline.slice(0, 30).map((item) => (
                              <button key={item.id} type="button" onClick={() => document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="block w-full rounded-r-lg border-l-2 border-transparent px-3 py-2 text-left text-sm leading-5 text-slate-400 transition hover:border-sky-400 hover:bg-slate-800 hover:text-sky-200">
                                {item.text.length > 66 ? item.text.slice(0, 63) + '…' : item.text}
                              </button>
                            ))}
                          </nav>
                        </div>
                      </aside>
                    )}
                  </div>
                </div>
              )}
            </section>
          )}

          {tab === 'summaries' && (
            <section className="space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-300">AI generated</p><h2 className="mt-1 text-xl font-semibold text-white sm:text-2xl">Summaries</h2></div>
                <span className="text-sm text-slate-400">1 summary saved</span>
              </div>
              <article className="overflow-hidden rounded-2xl border border-slate-700 bg-[#0f1829]">
                <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 px-5 py-4 sm:px-6">
                  <div className="min-w-0"><h3 className="break-words text-lg font-semibold text-slate-100">{set.title}</h3><p className="mt-1 text-xs text-slate-400">Summary · {formattedDate(set.createdAt)}</p></div>
                  <button type="button" onClick={() => void copySummary()} className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800">▤ Copy</button>
                </header>
                <div className="space-y-5 p-5 sm:p-6">
                  <p className="text-sm font-semibold uppercase tracking-wide text-slate-300">Summary</p>
                  {set.summary ? set.summary.split(/\n\s*\n/).filter(Boolean).map((paragraph, index) => <p key={index} className="whitespace-pre-wrap text-[15px] leading-8 text-slate-300 sm:text-base">{paragraph.trim()}</p>) : <p className="text-sm text-slate-400">No summary is available for this study set.</p>}
                  {copyStatus && <p role="status" className="text-xs text-emerald-300">{copyStatus}</p>}
                </div>
              </article>
            </section>
          )}

          {tab === 'notes' && <CornellNotesPanel studySetId={setId} />}
          {tab === 'flashcards' && <FlashcardViewer studySetId={setId} tags={tags} />}
          {tab === 'mindmap' && <MindMapPanel studySetId={setId} />}
          {tab === 'artifacts' && (
            <section className="space-y-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-300">Generated learning tools</p>
                <h2 className="mt-1 text-xl font-semibold text-white sm:text-2xl">Artifacts</h2>
                <p className="mt-2 text-sm text-slate-400">Practice your understanding with a graded quiz or turn the material into a narrated podcast script.</p>
              </div>
              <div className="flex w-full max-w-md gap-1 rounded-xl bg-slate-800 p-1">
                <button type="button" onClick={() => setArtifactTab('quiz')} className={'flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold ' + (artifactTab === 'quiz' ? 'bg-[#0b1220] text-white' : 'text-slate-400 hover:text-white')}>Quiz</button>
                <button type="button" onClick={() => setArtifactTab('podcast')} className={'flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold ' + (artifactTab === 'podcast' ? 'bg-[#0b1220] text-white' : 'text-slate-400 hover:text-white')}>Podcast</button>
              </div>
              {artifactTab === 'quiz' ? <QuizPlayer studySetId={setId} /> : <PodcastPanel studySetId={setId} />}
              <div className="pt-3"><ShareDocumentButton studySetId={setId} /></div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
