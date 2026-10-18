// ==============================================================================
// OWASP WSTG DEFENSE-IN-DEPTH: XSS PREVENTION & DATA SANITIZATION
// ==============================================================================
function escapeXml(unsafe) {
  if (unsafe === null || unsafe === undefined) return '';
  return String(unsafe).replace(/[<>&'"]/g, function (c) {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case "'": return '&#039;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}
const escapeHtml = escapeXml;

// Cendekia.ai & Kuliko Pro Platform Client Script
// Full Kuliko Pro Unlocked: Spaced Repetition SM-2, AI Podcast Audio, Streak & Activity Tracking

let currentView = 'dashboard';
let currentStudySet = null;
let currentFlashcardIdx = 0;
let flashcardsList = [];
let currentQuizIdx = 0;
let quizScore = 0;
let answeredQuiz = {};
let allStudySets = [];
let allSubjects = [];
let currentStudyTab = 'summary';

// Podcast Speech Synthesis State
let podcastDialogue = [];
let podcastTurnIdx = 0;
let isPodcastPlaying = false;
let podcastSpeed = 1.0;
let podcastTimer = null;
let podcastVoices = { leo: null, maya: null };

// Initialize Lucide Icons
function initIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// Toast Notification
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  const toastText = document.getElementById('toast-text');
  if (!toast || !toastText) return;
  toastText.innerText = message;
  toast.classList.remove('hidden');
  setTimeout(() => {
    toast.classList.add('hidden');
  }, 3500);
}

// Format Date ID
function getIndonesianDate() {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const now = new Date();
  return `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]}`;
}

// ---------------- VIEW NAVIGATION ----------------

function toggleMobileNav() {
  const drawer = document.getElementById('mobile-nav-drawer');
  if (drawer) drawer.classList.toggle('hidden');
}

function switchHeroPreview(tabName) {
  const tabs = ['deepdoc', 'flashcard', 'video', 'podcast', 'mindmap'];
  tabs.forEach(t => {
    const btn = document.getElementById(`hpreview-btn-${t}`);
    const content = document.getElementById(`hpreview-tab-${t}`);
    if (t === tabName) {
      if (btn) btn.className = "px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 text-white transition";
      if (content) content.classList.remove('hidden');
    } else {
      if (btn) btn.className = "px-3 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white bg-slate-950 border border-slate-800 transition";
      if (content) content.classList.add('hidden');
    }
  });
  initIcons();
}

function handleBrandLogoClick() {
  if (currentUser && currentUser.email) {
    showView('dashboard');
  } else {
    showView('landing');
  }
}

function showView(viewName) {
  // STRICT AUTH GUARD: When logged out, dashboard, workspace, library, subjects, study, settings CANNOT be accessed!
  if (viewName !== 'landing' && !currentUser) {
    currentView = 'landing';
    const views = ['dashboard', 'workspace', 'library', 'subjects', 'study', 'settings'];
    views.forEach(v => {
      const el = document.getElementById(`view-${v}`);
      if (el) el.classList.add('hidden');
    });
    const landingEl = document.getElementById('view-landing');
    if (landingEl) landingEl.classList.remove('hidden');
    showToast('Akses dibatasi. Silakan login terlebih dahulu untuk mengakses dashboard & materi.', 'info');
    promptGoogleSignIn();
    return;
  }

  // When logged in, landing page is NOT accessible - redirect to dashboard!
  if (viewName === 'landing' && currentUser && currentUser.email) {
    showView('dashboard');
    return;
  }

  currentView = viewName;
  const views = ['landing', 'dashboard', 'workspace', 'library', 'subjects', 'study', 'settings'];
  views.forEach(v => {
    const el = document.getElementById(`view-${v}`);
    if (el) el.classList.add('hidden');
    const navBtn = document.getElementById(`nav-btn-${v}`);
    if (navBtn) {
      if (v === 'landing') {
        if (currentUser && currentUser.email) {
          navBtn.classList.add('hidden');
          navBtn.classList.remove('flex');
          return;
        } else {
          navBtn.classList.remove('hidden');
          navBtn.classList.add('flex');
        }
      }
      if (v === viewName) {
        navBtn.className = "px-2.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-emerald-600/25 border border-emerald-500/40 flex items-center gap-1.5 transition shadow-sm whitespace-nowrap flex-shrink-0";
      } else {
        navBtn.className = "px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-900 transition flex items-center gap-1.5 whitespace-nowrap flex-shrink-0";
      }
    }
  });

  const activeEl = document.getElementById(`view-${viewName}`);
  if (activeEl) {
    activeEl.classList.remove('hidden');
  }

  const searchContainer = document.getElementById('nav-search-container');
  if (searchContainer) {
    if (currentUser && currentUser.email && viewName !== 'landing') {
      searchContainer.classList.remove('hidden');
    } else {
      searchContainer.classList.add('hidden');
    }
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (viewName === 'dashboard') {
    loadDashboard();
  } else if (viewName === 'library') {
    loadLibrary();
  } else if (viewName === 'subjects') {
    loadSubjectsView();
  } else if (viewName === 'workspace') {
    loadWorkspaceSubjects();
  } else if (viewName === 'settings') {
    populateProfileForm();
  }

  initIcons();
}

// ---------------- DASHBOARD & MOMENTUM ----------------

function renderStreakCalendar(weekDays, currentStreak) {
  const container = document.getElementById('dash-streak-calendar');
  if (!container || !weekDays) return;

  container.innerHTML = weekDays.map(wd => {
    let circleClass = "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ";
    let iconContent = "";

    if (wd.active) {
      if (wd.is_today) {
        circleClass += "bg-emerald-500 border border-teal-400 text-white shadow-md shadow-emerald-500/50";
        iconContent = "🔥";
      } else {
        circleClass += "bg-emerald-500/20 border border-emerald-500/50 text-emerald-400";
        iconContent = "✓";
      }
    } else {
      if (wd.is_today) {
        circleClass += "bg-amber-500/20 border border-amber-500/60 text-amber-300 animate-pulse";
        iconContent = "•";
      } else if (wd.is_past) {
        circleClass += "bg-slate-900 border border-slate-800 text-slate-600";
        iconContent = "•";
      } else {
        circleClass += "bg-slate-900/50 border border-slate-800/50 text-slate-700";
        iconContent = "";
      }
    }

    return `
      <div class="flex flex-col items-center gap-1">
        <span class="text-[10px] ${wd.is_today ? 'text-teal-300 font-bold' : 'text-slate-500'}">${escapeXml(wd.day)}</span>
        <div class="${circleClass}" title="${escapeXml(wd.date)}">${iconContent}</div>
      </div>
    `;
  }).join('');
}

async function loadDashboard() {
  const dateEl = document.getElementById('dash-date');
  if (dateEl) dateEl.innerText = getIndonesianDate();

  // Dynamic greeting based on current logged in user
  const greetingEl = document.getElementById('dash-greeting-text');
  if (greetingEl) {
    const uName = currentUser ? (currentUser.first_name || currentUser.full_name || 'Pembelajar') : 'Pembelajar';
    greetingEl.innerText = `Selamat Belajar, ${uName}`;
  }

  try {
    const res = await fetch('/api/dashboard');
    if (res.status === 401) { handleLogout(); return; }
    if (!res.ok) throw new Error('Gagal memuat dashboard');
    const data = await res.json();

    // Streak
    if (data.streak) {
      const streakCount = document.getElementById('nav-streak-count');
      const dashStreakDays = document.getElementById('dash-streak-days');
      const dashStreakStatus = document.getElementById('dash-streak-status');
      const dashStreakTitle = document.getElementById('dash-streak-title');

      if (streakCount) streakCount.innerText = data.streak.current;
      if (dashStreakDays) dashStreakDays.innerText = data.streak.current;
      if (dashStreakStatus) dashStreakStatus.innerText = data.streak.status_message;
      if (dashStreakTitle) dashStreakTitle.innerText = `${data.streak.current} DAY STREAK`;

      renderStreakCalendar(data.streak.week_days, data.streak.current);
    }

    // Stats
    if (data.stats) {
      const statStudy = document.getElementById('stat-weekly-study');
      const statDue = document.getElementById('stat-cards-due');
      const statQuizzes = document.getElementById('stat-quizzes');
      const statMastery = document.getElementById('stat-avg-mastery');
      if (statStudy) statStudy.innerText = data.stats.weekly_study || '0m';
      if (statDue) statDue.innerText = `${data.stats.cards_due || 0} Due`;
      if (statQuizzes) statQuizzes.innerText = `${data.stats.quizzes || 0} Selesai`;
      if (statMastery) statMastery.innerText = `${data.stats.avg_mastery || '0%'}`;
    }

    // Continue Your Session
    const cont = data.continue_session;
    const contTitle = document.getElementById('dash-cont-title');
    const contSub = document.getElementById('dash-cont-subject');
    const contDue = document.getElementById('dash-cont-due');
    const contEmoji = document.getElementById('dash-cont-emoji');
    const btnReview = document.getElementById('dash-btn-review-now');

    if (cont) {
      if (contTitle) contTitle.innerText = cont.title;
      if (contSub) contSub.innerText = cont.subject_name;
      if (contDue) contDue.innerText = `Review ${cont.due_cards} cards due`;
      if (contEmoji) contEmoji.innerText = cont.emoji || '📖';

      if (btnReview) {
        btnReview._targetSetId = cont.set_id;
        btnReview.innerHTML = `<span>Review now</span><i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>`;
        btnReview.onclick = () => openStudySet(cont.set_id, 'flashcards');
      }
    } else {
      if (contTitle) contTitle.innerText = 'Belum Ada Sesi Belajar Aktif';
      if (contSub) contSub.innerText = 'Buat materi baru untuk memulai belajar';
      if (contDue) contDue.innerText = '0 kartu perlu diulang';
      if (contEmoji) contEmoji.innerText = '✨';

      if (btnReview) {
        btnReview._targetSetId = null;
        btnReview.innerHTML = `<span>Buat Materi</span><i data-lucide="plus" class="w-3.5 h-3.5"></i>`;
        btnReview.onclick = () => showView('workspace');
      }
    }

    // Render Subjects Grid
    renderDashboardSubjects(data.subjects || []);

    // Render Recent Activities
    renderDashboardActivities(data.recent_activities || []);

    initIcons();
  } catch (err) {
    console.error('loadDashboard error:', err);
  }
}

function openContinueSession() {
  const btn = document.getElementById('dash-btn-review-now');
  if (btn && btn._targetSetId) {
    openStudySet(btn._targetSetId, 'flashcards');
  } else {
    showView('library');
  }
}

function renderDashboardSubjects(subjects) {
  const container = document.getElementById('dash-subjects-grid');
  if (!container) return;

  if (!subjects || subjects.length === 0) {
    container.innerHTML = `
      <div class="col-span-full text-center py-8 card-glow rounded-2xl p-6 border border-slate-800">
        <i data-lucide="folder" class="w-8 h-8 text-slate-600 mx-auto mb-2"></i>
        <p class="text-xs text-slate-400 mb-3">Belum ada subjek pelajaran aktif.</p>
        <button onclick="openCreateSubjectModal()" class="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition inline-flex items-center gap-1.5 shadow-md shadow-emerald-600/30">
          <i data-lucide="plus" class="w-3.5 h-3.5"></i>
          <span>Buat Subjek Baru</span>
        </button>
      </div>
    `;
    initIcons();
    return;
  }

  container.innerHTML = subjects.slice(0, 4).map(sub => `
    <div onclick="filterLibraryBySubject(${sub.id})" class="card-glow rounded-2xl p-5 border border-slate-800 hover:border-emerald-500/50 cursor-pointer transition flex flex-col justify-between group">
      <div>
        <div class="flex items-center justify-between mb-3">
          <span class="text-2xl">${escapeXml(sub.emoji || '📚')}</span>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-teal-300 border border-emerald-500/20">${escapeXml(sub.mastery_level || 'Novice')}</span>
        </div>
        <h4 class="text-sm font-bold text-white group-hover:text-teal-300 transition line-clamp-1">${escapeXml(sub.name)}</h4>
        <p class="text-xs text-slate-400 mt-1 line-clamp-2">${escapeXml(sub.description || 'Kumpulan bahan ajar dan flashcard.')}</p>
      </div>

      <div class="flex items-center justify-between pt-4 mt-3 border-t border-slate-800/80 text-[11px] text-slate-400">
        <span class="flex items-center gap-1"><i data-lucide="file" class="w-3.5 h-3.5 text-slate-500"></i> ${sub.docs_count || 0} docs</span>
        <span class="text-amber-400 font-semibold">${sub.cards_due || 0} due</span>
      </div>
    </div>
  `).join('');

  initIcons();
}

function renderDashboardActivities(activities) {
  const container = document.getElementById('dash-activity-list');
  if (!container) return;

  if (!activities || activities.length === 0) {
    container.innerHTML = '<p class="text-xs text-slate-500 py-4 text-center">Belum ada riwayat aktivitas belajar.</p>';
    return;
  }

  container.innerHTML = activities.map(act => {
    let icon = 'clock';
    let iconColor = 'text-slate-400';
    if (act.activity_type === 'quiz') {
      icon = 'check-circle-2';
      iconColor = 'text-emerald-400';
    } else if (act.activity_type === 'card_review') {
      icon = 'layers';
      iconColor = 'text-amber-400';
    } else if (act.activity_type === 'open_doc' || act.activity_type === 'new_doc') {
      icon = 'book-open';
      iconColor = 'text-teal-400';
    }

    return `
      <div class="flex items-start gap-3 pt-3 first:pt-0">
        <div class="mt-0.5">
          <i data-lucide="${icon}" class="w-4 h-4 ${iconColor}"></i>
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-xs font-semibold text-slate-200 truncate">${escapeXml(act.title)}</div>
          <div class="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
            <span>${escapeXml(act.subject_name || 'Umum')}</span>
            <span>•</span>
            <span>${formatTimeAgo(act.created_at)}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  initIcons();
}

function formatTimeAgo(dateStr) {
  if (!dateStr) return 'Baru saja';
  try {
    const d = new Date(dateStr);
    const diff = Math.floor((new Date() - d) / 1000);
    if (diff < 60) return 'Baru saja';
    if (diff < 3600) return `${Math.floor(diff / 60)} mnt lalu`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
    return `${Math.floor(diff / 86400)} hari lalu`;
  } catch (e) {
    return 'Baru saja';
  }
}

// ---------------- SUBJECTS MANAGEMENT ----------------

async function loadSubjectsView() {
  try {
    const res = await fetch('/api/subjects');
    if (res.status === 401) { handleLogout(); return; }
    const data = await res.json();
    allSubjects = data.subjects || [];

    const container = document.getElementById('subjects-full-grid');
    if (!container) return;

    if (!allSubjects || allSubjects.length === 0) {
      container.innerHTML = `
        <div class="col-span-full text-center py-16 card-glow rounded-3xl p-8 border border-slate-800">
          <i data-lucide="folder" class="w-12 h-12 text-slate-600 mx-auto mb-3"></i>
          <h3 class="text-base font-bold text-white mb-1">Belum Ada Subjek Pelajaran</h3>
          <p class="text-xs text-slate-400 mb-5 max-w-sm mx-auto">Kelompokkan bahan ajar ke dalam mata kuliah atau topik spesifik.</p>
          <button onclick="openCreateSubjectModal()" class="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30 inline-flex items-center gap-1.5 transition">
            <i data-lucide="plus" class="w-4 h-4"></i>
            <span>Buat Subjek Sekarang</span>
          </button>
        </div>
      `;
      initIcons();
      return;
    }

    container.innerHTML = allSubjects.map(sub => `
      <div class="card-glow rounded-3xl p-6 border border-slate-800 flex flex-col justify-between group hover:border-emerald-500/40 transition">
        <div>
          <div class="flex items-center justify-between mb-4">
            <span class="text-3xl">${escapeXml(sub.emoji || '📚')}</span>
            <span class="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-teal-300 border border-emerald-500/30">${escapeXml(sub.mastery_level || 'Novice')}</span>
          </div>
          <h3 class="text-base font-bold text-white group-hover:text-teal-300 transition">${escapeXml(sub.name)}</h3>
          <p class="text-xs text-slate-400 mt-2 leading-relaxed">${escapeXml(sub.description || 'Kumpulan materi kuliah dan latihan soal.')}</p>
        </div>

        <div class="pt-5 mt-4 border-t border-slate-800/80 flex items-center justify-between">
          <span class="text-xs text-slate-400">${sub.docs_count || 0} Dokumen Materi</span>
          <button onclick="filterLibraryBySubject(${sub.id})" class="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-1 shadow-md shadow-emerald-600/30">
            <span>Buka Materi</span>
            <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      </div>
    `).join('');

    initIcons();
  } catch (e) {
    console.error('loadSubjectsView error:', e);
  }
}

async function loadWorkspaceSubjects() {
  try {
    const res = await fetch('/api/subjects');
    const data = await res.json();
    const select = document.getElementById('ws-subject-select');
    if (!select) return;

    select.innerHTML = (data.subjects || []).map(s => `
      <option value="${s.id}">${escapeXml(s.emoji || '📚')} ${escapeXml(s.name)}</option>
    `).join('');
  } catch (e) {
    console.error('loadWorkspaceSubjects error:', e);
  }
}

function openCreateSubjectModal() {
  const modal = document.getElementById('subject-modal');
  if (modal) modal.classList.remove('hidden');
}

function closeSubjectModal() {
  const modal = document.getElementById('subject-modal');
  if (modal) modal.classList.add('hidden');
}

async function submitCreateSubject() {
  const emoji = document.getElementById('sub-emoji-input').value.trim() || '📚';
  const name = document.getElementById('sub-name-input').value.trim();
  const desc = document.getElementById('sub-desc-input').value.trim();

  if (!name) {
    alert('Nama subjek wajib diisi.');
    return;
  }

  try {
    const res = await fetch('/api/subjects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name, emoji: emoji, description: desc })
    });
    if (!res.ok) throw new Error('Gagal membuat subjek');
    closeSubjectModal();
    showToast(`Subjek '${name}' berhasil dibuat!`);
    loadSubjectsView();
    loadWorkspaceSubjects();
  } catch (e) {
    alert('Error: ' + e.message);
  }
}

// ---------------- LIBRARY / STUDY SETS ----------------

async function loadLibrary(subjectId = null) {
  try {
    const url = subjectId ? `/api/study-sets?subject_id=${subjectId}` : '/api/study-sets';
    const res = await fetch(url);
    const sets = await res.json();
    allStudySets = sets;

    // Load subjects for filter pills
    const subsRes = await fetch('/api/subjects');
    const subsData = await subsRes.json();
    allSubjects = subsData.subjects || [];

    // Render filter pills
    const pillsContainer = document.getElementById('lib-subject-pills');
    if (pillsContainer) {
      let pillsHtml = `
        <button onclick="loadLibrary(null)" class="px-3 py-1.5 rounded-xl text-xs font-semibold ${!subjectId ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'} transition">Semua Subjek</button>
      `;
      allSubjects.forEach(s => {
        const isActive = subjectId === s.id;
        pillsHtml += `
          <button onclick="loadLibrary(${s.id})" class="px-3 py-1.5 rounded-xl text-xs font-semibold ${isActive ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'} transition flex items-center gap-1.5">
            <span>${escapeXml(s.emoji || '📚')}</span>
            <span>${escapeXml(s.name)}</span>
          </button>
        `;
      });
      pillsContainer.innerHTML = pillsHtml;
    }

    renderStudySetsGrid(sets);
  } catch (e) {
    console.error('loadLibrary error:', e);
  }
}

function filterLibraryBySubject(subId) {
  showView('library');
  loadLibrary(subId);
}

function renderStudySetsGrid(sets) {
  const container = document.getElementById('lib-sets-grid');
  if (!container) return;

  if (!sets || sets.length === 0) {
    container.innerHTML = `
      <div class="col-span-3 text-center py-16 card-glow rounded-3xl p-8 border border-slate-800">
        <i data-lucide="book-open" class="w-12 h-12 text-slate-600 mx-auto mb-3"></i>
        <h3 class="text-base font-bold text-white mb-1">Belum Ada Materi Belajar</h3>
        <p class="text-xs text-slate-400 mb-4">Buat materi pertamamu sekarang lewat tombol di bawah.</p>
        <button onclick="showView('workspace')" class="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30 transition">Buat Materi Baru</button>
      </div>
    `;
    initIcons();
    return;
  }

  container.innerHTML = sets.map(s => {
    let sourceIcon = 'file-text';
    let sourceBadge = 'Teks';
    if (s.source_type === 'pdf') {
      sourceIcon = 'file-up';
      sourceBadge = 'PDF';
    } else if (s.source_type === 'youtube') {
      sourceIcon = 'youtube';
      sourceBadge = 'YouTube';
    }

    return `
      <div class="card-glow rounded-3xl p-6 border border-slate-800 hover:border-emerald-500/40 transition flex flex-col justify-between group">
        <div>
          <div class="flex items-center justify-between gap-2 mb-3">
            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-teal-300 border border-emerald-500/30 flex items-center gap-1">
              <i data-lucide="${sourceIcon}" class="w-3 h-3"></i>
              <span>${sourceBadge}</span>
            </span>
            <span class="text-[11px] text-slate-500">${formatDateShort(s.created_at)}</span>
          </div>

          <h3 onclick="openStudySet(${s.id})" class="text-base font-extrabold text-white group-hover:text-teal-300 transition cursor-pointer line-clamp-2 mb-2">${escapeXml(s.title)}</h3>
          <p class="text-xs text-slate-400 line-clamp-1">${escapeXml(s.subject_name || 'Umum')}</p>
        </div>

        <div class="pt-5 mt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <div class="flex items-center gap-3">
            <span class="flex items-center gap-1 text-amber-400 font-semibold"><i data-lucide="layers" class="w-3.5 h-3.5"></i> ${s.flashcards_count || 0} cards</span>
            <span class="flex items-center gap-1 text-emerald-400 font-semibold"><i data-lucide="check-square" class="w-3.5 h-3.5"></i> ${s.quiz_count || 0} quiz</span>
          </div>

          <button onclick="openStudySet(${s.id})" class="p-2 rounded-xl bg-slate-900 group-hover:bg-emerald-600 text-slate-300 group-hover:text-white transition">
            <i data-lucide="arrow-right" class="w-4 h-4"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');

  initIcons();
}

function formatDateShort(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;
  } catch (e) {
    return dateStr;
  }
}

// ---------------- WORKSPACE CREATION ----------------

let currentWsTab = 'text';

function setWsSourceTab(tab) {
  currentWsTab = tab;
  ['text', 'pdf', 'youtube'].forEach(t => {
    const btn = document.getElementById(`ws-tab-${t}`);
    const panel = document.getElementById(`ws-panel-${t}`);
    if (t === tab) {
      if (btn) btn.className = "flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 transition";
      if (panel) panel.classList.remove('hidden');
    } else {
      if (btn) btn.className = "flex-1 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white flex items-center justify-center gap-2 transition";
      if (panel) panel.classList.add('hidden');
    }
  });
}

function handlePdfSelected(input) {
  const nameEl = document.getElementById('ws-pdf-filename');
  if (input.files && input.files[0]) {
    nameEl.innerText = input.files[0].name;
    const titleInput = document.getElementById('ws-title-input');
    if (!titleInput.value) {
      titleInput.value = input.files[0].name.replace('.pdf', '');
    }
  }
}

function loadTopicPreset(topic) {
  const content = document.getElementById('ws-text-content');
  const title = document.getElementById('ws-title-input');

  if (topic === 'biologi') {
    title.value = 'Fotosintesis & Metabolisme Tumbuhan';
    content.value = `Fotosintesis adalah proses biokimia pembentukan karbohidrat dari bahan anorganik (karbon dioksida dan air) oleh klorofil dengan bantuan energi cahaya matahari. 
Reaksi terang berlangsung di tilakoid kloroplas menghasilkan ATP dan NADPH. 
Reaksi gelap (Siklus Calvin) berlangsung di stroma kloroplas menggunakan ATP dan NADPH untuk mereduksi CO2 menjadi glukosa.
Faktor yang memengaruhi laju fotosintesis antara lain intensitas cahaya, konsentrasi CO2, suhu optimal, dan ketersediaan air.`;
  } else if (topic === 'mcp') {
    title.value = 'Model Context Protocol (MCP) & Autonomous Agent';
    content.value = `Model Context Protocol (MCP) adalah standar komunikasi terbuka yang memungkinkan model AI terhubung secara mulus dengan alat, data, dan server eksternal.
MCP mendukung arsitektur client-server dengan dua transport utama: STDIO (eksekusi lokal) dan Streamable HTTP/SSE (koneksi remote aman HTTPS).
Kelebihan MCP: isolasi keamanan tinggi, standar skema tool yang konsisten antar model (Claude, GPT, Gemini), dan integrasi dinamis tanpa perlu modifikasi model core.`;
  } else if (topic === 'kepler') {
    title.value = 'Hukum Gerak Planet Kepler';
    content.value = `Hukum Kepler terdiri atas 3 hukum empiris yang menjelaskan gerakan planet mengelilingi matahari:
1. Hukum I Kepler (Hukum Lintasan Elips): Semua planet bergerak pada lintasan elips dengan Matahari berada pada salah satu titik fokusnya.
2. Hukum II Kepler (Hukum Luas Area): Garis khayal yang menghubungkan planet dengan Matahari menyapu luasan area yang sama dalam interval waktu yang sama.
3. Hukum III Kepler (Hukum Harmonik): Kuadrat periode orbit planet sebanding dengan pangkat tiga sumbu semi-mayor orbitnya (T^2 / r^3 = konstan).`;
  } else if (topic === 'ekonomi') {
    title.value = 'Inflasi & Kebijakan Moneter';
    content.value = `Inflasi adalah kenaikan harga barang dan jasa secara umum dan terus menerus dalam jangka waktu tertentu.
Penyebab inflasi meliputi demand-pull inflation (tarikan permintaan tinggi) dan cost-push inflation (dorongan kenaikan biaya produksi).
Bank Sentral mengendalikan inflasi melalui kebijakan moneter: menaikkan suku bunga acuan (BI-Rate), operasi pasar terbuka, dan penyesuaian giro wajib minimum (GWM).`;
  }
}

async function submitCreateStudySet() {
  const submitBtn = document.getElementById('ws-submit-btn');
  const levelRadio = document.querySelector('input[name="ws-level"]:checked');
  const level = levelRadio ? levelRadio.value : 'standar';
  const customTitle = document.getElementById('ws-title-input').value.trim();
  const subjectId = document.getElementById('ws-subject-select').value;

  submitBtn.disabled = true;
  submitBtn.innerHTML = `
    <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
    <span>Memproses Materi & Membuat Paket Belajar...</span>
  `;

  try {
    let result = null;

    if (currentWsTab === 'text') {
      const text = document.getElementById('ws-text-content').value.trim();
      if (!text || text.length < 15) {
        throw new Error('Materi teks minimal 15 karakter.');
      }
      const res = await fetch('/api/study-sets/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: customTitle,
          content: text,
          level: level,
          subject_id: subjectId ? parseInt(subjectId) : null
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Gagal memproses teks');
      }
      result = await res.json();
    } else if (currentWsTab === 'pdf') {
      const fileInput = document.getElementById('ws-pdf-file');
      if (!fileInput.files || !fileInput.files[0]) {
        throw new Error('Pilih file PDF terlebih dahulu.');
      }
      const formData = new FormData();
      formData.append('file', fileInput.files[0]);
      if (customTitle) formData.append('title', customTitle);
      formData.append('level', level);
      if (subjectId) formData.append('subject_id', subjectId);

      const res = await fetch('/api/study-sets/pdf', {
        method: 'POST',
        body: formData
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Gagal membaca PDF');
      }
      result = await res.json();
    } else if (currentWsTab === 'youtube') {
      const url = document.getElementById('ws-youtube-url').value.trim();
      if (!url) throw new Error('Masukkan URL YouTube.');
      const res = await fetch('/api/study-sets/youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: customTitle,
          url: url,
          level: level,
          subject_id: subjectId ? parseInt(subjectId) : null
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Gagal memproses YouTube');
      }
      result = await res.json();
    }

    showToast('Paket belajar AI berhasil dibuat!');
    if (result && result.id) {
      openStudySet(result.id);
    } else {
      showView('library');
    }

  } catch (err) {
    alert('Terjadi Kesalahan: ' + err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `
      <i data-lucide="sparkles" class="w-4 h-4 text-amber-300"></i>
      <span>Generate Paket Belajar Lengkap (AI Pro)</span>
    `;
    initIcons();
  }
}

// ---------------- STUDY WORKSPACE (CORE LEARNING) ----------------

async function openStudySet(setId, initialTab = 'summary') {
  showView('study');
  currentFlashcardIdx = 0;
  currentQuizIdx = 0;
  quizScore = 0;
  answeredQuiz = {};

  try {
    const res = await fetch(`/api/study-sets/${setId}`);
    if (!res.ok) throw new Error('Gagal memuat materi');
    const data = await res.json();
    currentStudySet = data;

    // Header info
    const titleEl = document.getElementById('study-title');
    const subBadge = document.getElementById('study-subject-badge');
    const srcBadge = document.getElementById('study-source-badge');
    const dateEl = document.getElementById('study-date');

    if (titleEl) titleEl.innerText = data.title;
    if (subBadge) subBadge.innerText = data.subject_name || 'Umum';
    if (dateEl) dateEl.innerText = formatDateShort(data.created_at);

    if (srcBadge) {
      let icon = 'file-text';
      let label = 'Teks';
      if (data.source_type === 'pdf') { icon = 'file-up'; label = 'PDF'; }
      else if (data.source_type === 'youtube') { icon = 'youtube'; label = 'YouTube'; }
      srcBadge.innerHTML = `
        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700 inline-flex items-center gap-1">
          <i data-lucide="${icon}" class="w-3 h-3 text-teal-400"></i>
          <span>${label}</span>
        </span>
      `;
    }

    // Render Summary
    const summaryContainer = document.getElementById('study-summary-content');
    if (summaryContainer) {
      if (window.marked) {
        summaryContainer.innerHTML = window.marked.parse(data.summary || '');
      } else {
        summaryContainer.innerText = data.summary || '';
      }
    }

    // Flashcards Init
    flashcardsList = data.flashcards || [];
    renderFlashcard();

    // Quiz Init
    renderQuizQuestion();

    // Mindmap Init
    renderMindmap(data.mindmap);

    // Podcast Init
    loadPodcastData(data.podcast, data.title);

    // Tutor Chat Init
    renderTutorChat(data.chat_history || []);

    switchStudyTab(initialTab);
    initIcons();

  } catch (err) {
    console.error('openStudySet error:', err);
    alert('Gagal membuka materi: ' + err.message);
  }
}

function switchStudyTab(tab) {
  currentStudyTab = tab;
  const tabs = ['summary', 'deepdoc', 'flashcards', 'video', 'podcast', 'quiz', 'mindmap', 'tutor'];

  tabs.forEach(t => {
    const btn = document.getElementById(`tab-btn-${t}`);
    const panel = document.getElementById(`study-panel-${t}`);

    if (t === tab) {
      if (btn) btn.className = "px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-emerald-600 text-white shadow-md shadow-emerald-600/20 flex items-center gap-2 transition";
      if (panel) panel.classList.remove('hidden');
    } else {
      if (btn) btn.className = "px-4 py-2 rounded-xl text-xs sm:text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-900 flex items-center gap-2 transition";
      if (panel) panel.classList.add('hidden');
    }
  });

  const activeSet = currentStudySet || (typeof currentSet !== 'undefined' ? currentSet : null);

  if (tab === 'deepdoc' && activeSet) {
    loadDeepDocument(activeSet.id);
  }
  if (tab === 'video' && activeSet) {
    loadVideoStoryboard(activeSet.id);
  }
  if (tab === 'mindmap' && activeSet) {
    setTimeout(() => renderMindmap(activeSet.mindmap), 50);
  }

  initIcons();
}

// ---------------- FLASHCARD 3D & SPACED REPETITION (SM-2) ----------------

let isDueOnly = false;

function toggleDueFilter() {
  const cb = document.getElementById('fc-filter-due');
  isDueOnly = cb ? cb.checked : false;
  currentFlashcardIdx = 0;
  renderFlashcard();
}

function getActiveCards() {
  if (!flashcardsList) return [];
  if (!isDueOnly) return flashcardsList;
  const today = new Date().toISOString().split('T')[0];
  return flashcardsList.filter(c => (c.next_review <= today || (c.mastery_score || 0) < 70));
}

function renderFlashcard() {
  const cards = getActiveCards();
  const counter = document.getElementById('fc-counter');
  const masteryLabel = document.getElementById('fc-mastery-label');
  const frontText = document.getElementById('fc-front-text');
  const backText = document.getElementById('fc-back-text');
  const cardInner = document.getElementById('fc-card-inner');

  if (cardInner) cardInner.classList.remove('flipped');

  if (!cards || cards.length === 0) {
    if (counter) counter.innerText = '0 / 0';
    if (frontText) frontText.innerHTML = '<span class="text-emerald-400">🎉 Semua kartu hafalan telah dikuasai hari ini!</span>';
    if (backText) backText.innerText = 'Bagus sekali! Kembali besok untuk review berkala.';
    return;
  }

  if (currentFlashcardIdx >= cards.length) currentFlashcardIdx = 0;
  if (currentFlashcardIdx < 0) currentFlashcardIdx = cards.length - 1;

  const card = cards[currentFlashcardIdx];
  if (counter) counter.innerText = `Kartu ${currentFlashcardIdx + 1} / ${cards.length}`;
  if (masteryLabel) masteryLabel.innerText = `Mastery: ${card.mastery_score || 0}%`;
  if (frontText) frontText.innerText = card.front;
  if (backText) backText.innerText = card.back;
}

function flipFlashcard() {
  const inner = document.getElementById('fc-card-inner');
  if (inner) inner.classList.toggle('flipped');
}

function nextFlashcard() {
  const cards = getActiveCards();
  if (cards.length === 0) return;
  currentFlashcardIdx = (currentFlashcardIdx + 1) % cards.length;
  renderFlashcard();
}

function prevFlashcard() {
  const cards = getActiveCards();
  if (cards.length === 0) return;
  currentFlashcardIdx = (currentFlashcardIdx - 1 + cards.length) % cards.length;
  renderFlashcard();
}

async function rateCurrentCard(rating) {
  const cards = getActiveCards();
  if (!cards || cards.length === 0) return;
  const card = cards[currentFlashcardIdx];

  try {
    const res = await fetch(`/api/flashcards/${card.id}/rate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: rating })
    });
    if (!res.ok) throw new Error('Gagal update rating');
    const updated = await res.json();

    // Update in local memory
    card.mastery_score = updated.mastery_score;
    card.next_review = updated.next_review;

    let ratingMsg = 'Good (+4 hari)';
    if (rating === 1) ratingMsg = 'Again (Ulangi besok)';
    else if (rating === 2) ratingMsg = 'Hard (+2 hari)';
    else if (rating === 4) ratingMsg = 'Easy (+1-2 minggu)';

    showToast(`Nilai tersimpan: ${ratingMsg}`);
    nextFlashcard();
  } catch (e) {
    console.error('rateCurrentCard error:', e);
  }
}

// ---------------- QUIZ MECHANICS ----------------

function renderQuizQuestion() {
  if (!currentStudySet || !currentStudySet.quiz) return;
  const quiz = currentStudySet.quiz;

  const numEl = document.getElementById('quiz-question-number');
  const scoreEl = document.getElementById('quiz-score-display');
  const textEl = document.getElementById('quiz-question-text');
  const container = document.getElementById('quiz-options-container');
  const expBox = document.getElementById('quiz-explanation-box');

  if (expBox) expBox.classList.add('hidden');

  if (quiz.length === 0) {
    if (textEl) textEl.innerText = 'Belum ada kuis untuk materi ini.';
    return;
  }

  if (currentQuizIdx >= quiz.length) currentQuizIdx = 0;
  if (currentQuizIdx < 0) currentQuizIdx = quiz.length - 1;

  const q = quiz[currentQuizIdx];
  if (numEl) numEl.innerText = `Soal ${currentQuizIdx + 1} dari ${quiz.length}`;
  if (scoreEl) scoreEl.innerText = `${quizScore} / ${quiz.length}`;
  if (textEl) textEl.innerText = q.question;

  const options = q.options || [];
  const selected = answeredQuiz[currentQuizIdx];

  container.innerHTML = options.map((opt, idx) => {
    let optLetter = opt.slice(0, 1).toUpperCase();
    if (!['A', 'B', 'C', 'D'].includes(optLetter)) {
      optLetter = String.fromCharCode(65 + idx);
    }

    let btnStyle = "p-4 rounded-2xl border border-slate-800 bg-slate-900/80 hover:bg-slate-900 text-left text-xs sm:text-sm text-slate-200 flex items-center gap-3 transition cursor-pointer";

    if (selected !== undefined) {
      if (optLetter === q.answer.trim().slice(0, 1).toUpperCase()) {
        btnStyle = "p-4 rounded-2xl border border-emerald-500 bg-emerald-500/20 text-emerald-200 text-left text-xs sm:text-sm font-semibold flex items-center gap-3 transition";
      } else if (selected === optLetter) {
        btnStyle = "p-4 rounded-2xl border border-rose-500 bg-rose-500/20 text-rose-200 text-left text-xs sm:text-sm font-semibold flex items-center gap-3 transition";
      } else {
        btnStyle = "p-4 rounded-2xl border border-slate-800/40 bg-slate-950/40 opacity-40 text-left text-xs sm:text-sm flex items-center gap-3";
      }
    }

    return `
      <div onclick="selectQuizAnswer('${optLetter}')" class="${btnStyle}">
        <span class="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-xs">${optLetter}</span>
        <span class="flex-1">${escapeXml(opt)}</span>
      </div>
    `;
  }).join('');

  if (selected !== undefined && q.explanation) {
    if (expBox) {
      expBox.classList.remove('hidden');
      expBox.innerHTML = `
        <div class="font-bold text-teal-300 flex items-center gap-1.5 mb-1">
          <i data-lucide="info" class="w-4 h-4"></i>
          <span>Pembahasan Kuis:</span>
        </div>
        <p class="leading-relaxed">${escapeXml(q.explanation)}</p>
      `;
      initIcons();
    }
  }
}

function selectQuizAnswer(optLetter) {
  if (answeredQuiz[currentQuizIdx] !== undefined) return;
  const q = currentStudySet.quiz[currentQuizIdx];
  const correct = q.answer.trim().slice(0, 1).toUpperCase();

  answeredQuiz[currentQuizIdx] = optLetter;
  if (optLetter === correct) {
    quizScore += 1;
    showToast('Jawaban Benar! 🎉');
  } else {
    showToast('Jawaban Kurang Tepat! 💡');
  }

  renderQuizQuestion();
}

function nextQuizQuestion() {
  if (!currentStudySet || !currentStudySet.quiz) return;
  if (currentQuizIdx < currentStudySet.quiz.length - 1) {
    currentQuizIdx++;
    renderQuizQuestion();
  } else {
    showToast(`Kuis Selesai! Skor Akhir: ${quizScore} / ${currentStudySet.quiz.length}`);
  }
}

function prevQuizQuestion() {
  if (currentQuizIdx > 0) {
    currentQuizIdx--;
    renderQuizQuestion();
  }
}

// ---------------- MINDMAP SVG DUAL-SCHEMA NORMALIZER ----------------

// ---------------- MIND MAP (BI-DIRECTIONAL TREE LAYOUT) ----------------

let mindmapZoom = 1;
let mindmapPan = { x: 0, y: 0 };
let isMindmapDragging = false;
let mindmapDragStart = { x: 0, y: 0 };
let currentMindmapData = null;

function zoomMindmap(delta) {
  mindmapZoom = Math.min(Math.max(mindmapZoom + delta, 0.4), 2.5);
  updateMindmapTransform();
}

function resetMindmapZoom() {
  mindmapZoom = 1;
  mindmapPan = { x: 0, y: 0 };
  updateMindmapTransform();
}

function updateMindmapTransform() {
  const vp = document.getElementById('mindmap-viewport');
  if (vp) {
    vp.setAttribute('transform', `translate(${mindmapPan.x}, ${mindmapPan.y}) scale(${mindmapZoom})`);
  }
}

function exportMindmapSvg() {
  const svg = document.getElementById('mindmap-svg');
  if (!svg) return;
  const serializer = new XMLSerializer();
  const source = serializer.serializeToString(svg);
  const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cendekia_mindmap_${currentStudySet ? currentStudySet.id : 'set'}.svg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Mind map SVG berhasil diunduh!', 'success');
}

function initMindmapPanZoom() {
  const container = document.getElementById('mindmap-container');
  if (!container || container.dataset.panInit === 'true') return;
  container.dataset.panInit = 'true';

  container.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    isMindmapDragging = true;
    mindmapDragStart = { x: e.clientX - mindmapPan.x, y: e.clientY - mindmapPan.y };
  });

  window.addEventListener('mousemove', (e) => {
    if (!isMindmapDragging) return;
    mindmapPan.x = e.clientX - mindmapDragStart.x;
    mindmapPan.y = e.clientY - mindmapDragStart.y;
    updateMindmapTransform();
  });

  window.addEventListener('mouseup', () => {
    isMindmapDragging = false;
  });

  container.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.08 : -0.08;
    zoomMindmap(delta);
  }, { passive: false });
}

function renderMindmap(mindmapData) {
  const svg = document.getElementById('mindmap-svg');
  if (!svg || !mindmapData) return;
  currentMindmapData = mindmapData;
  initMindmapPanZoom();

  svg.innerHTML = '';

  const rootName = mindmapData.name || mindmapData.root || mindmapData.topic || (currentStudySet ? currentStudySet.title : 'Topik Materi');
  let rawBranches = mindmapData.children || mindmapData.branches || mindmapData.nodes || [];

  const branches = rawBranches.map(b => {
    if (typeof b === 'string') return { name: b, children: [] };
    const leaves = b.children || b.sub_points || b.subpoints || b.items || [];
    return {
      name: b.name || b.topic || b.title || 'Cabang',
      children: leaves.map(l => typeof l === 'string' ? l : (l.name || l.title || l.text || 'Poin'))
    };
  });

  const width = 1300;
  const height = 750;
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

  // SVG Defs (Gradients & Filters)
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  defs.innerHTML = `
    <linearGradient id="rootGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#059669" />
      <stop offset="100%" stop-color="#0d9488" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  `;
  svg.appendChild(defs);

  // Viewport Group for Pan & Zoom
  const viewport = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  viewport.id = 'mindmap-viewport';
  viewport.setAttribute('transform', `translate(${mindmapPan.x}, ${mindmapPan.y}) scale(${mindmapZoom})`);
  svg.appendChild(viewport);

  const cx = width / 2;
  const cy = height / 2;

  // Split branches into Right and Left for balanced bi-directional symmetry
  const rightBranches = [];
  const leftBranches = [];
  branches.forEach((b, i) => {
    if (i % 2 === 0) rightBranches.push(b);
    else leftBranches.push(b);
  });

  // Layer groups inside viewport to preserve z-index (links behind nodes)
  const linksGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  const nodesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  viewport.appendChild(linksGroup);
  viewport.appendChild(nodesGroup);

  const rootW = 220;
  const rootH = 52;

  // Function to layout each side
  function layoutSide(sideBranches, isRight) {
    if (!sideBranches || sideBranches.length === 0) return;
    const sign = isRight ? 1 : -1;

    // Calculate slots and spacing
    const slotH = 46;
    let totalSlots = 0;
    sideBranches.forEach(b => {
      totalSlots += Math.max(b.children.length, 1);
    });

    const totalSideH = totalSlots * slotH + (sideBranches.length - 1) * 24;
    let curY = cy - totalSideH / 2 + slotH / 2;

    sideBranches.forEach((b, bIdx) => {
      const leaves = b.children || [];
      const leafCount = Math.max(leaves.length, 1);

      const firstY = curY;
      const lastY = curY + (leafCount - 1) * slotH;
      const branchCenterY = (firstY + lastY) / 2;
      const branchCenterX = cx + sign * 280;
      const branchW = 180;
      const branchH = 42;

      // Cubic Bézier connector from Root to Branch
      const rx = cx + sign * (rootW / 2);
      const ry = cy;
      const bx = branchCenterX - sign * (branchW / 2);
      const by = branchCenterY;
      const c1x = rx + sign * 80;
      const c2x = bx - sign * 80;

      const rootLink = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      rootLink.setAttribute('d', `M ${rx} ${ry} C ${c1x} ${ry}, ${c2x} ${by}, ${bx} ${by}`);
      rootLink.setAttribute('fill', 'none');
      rootLink.setAttribute('stroke', '#10b981');
      rootLink.setAttribute('stroke-width', '2.5');
      rootLink.setAttribute('stroke-opacity', '0.75');
      rootLink.setAttribute('class', 'mindmap-link');
      linksGroup.appendChild(rootLink);

      // Branch Card Node
      const bg = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      bg.setAttribute('class', 'mindmap-node');

      const brect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      brect.setAttribute('x', branchCenterX - branchW / 2);
      brect.setAttribute('y', branchCenterY - branchH / 2);
      brect.setAttribute('width', branchW);
      brect.setAttribute('height', branchH);
      brect.setAttribute('rx', '14');
      brect.setAttribute('fill', '#09111e');
      brect.setAttribute('stroke', '#059669');
      brect.setAttribute('stroke-width', '1.8');

      // Accent color bar on connector anchor edge
      const bar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      bar.setAttribute('x', isRight ? (branchCenterX - branchW / 2) : (branchCenterX + branchW / 2 - 4));
      bar.setAttribute('y', branchCenterY - branchH / 2 + 6);
      bar.setAttribute('width', 4);
      bar.setAttribute('height', branchH - 12);
      bar.setAttribute('rx', '2');
      bar.setAttribute('fill', '#10b981');

      const btext = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      btext.setAttribute('x', branchCenterX + (isRight ? 4 : -4));
      btext.setAttribute('y', branchCenterY + 4);
      btext.setAttribute('text-anchor', 'middle');
      btext.setAttribute('fill', '#f8fafc');
      btext.setAttribute('font-size', '12');
      btext.setAttribute('font-weight', '700');
      btext.textContent = b.name.length > 20 ? b.name.slice(0, 18) + '...' : b.name;

      bg.appendChild(brect);
      bg.appendChild(bar);
      bg.appendChild(btext);
      nodesGroup.appendChild(bg);

      // Layout Leaves for this branch
      leaves.forEach((leafText, lIdx) => {
        const leafCenterY = curY;
        const leafCenterX = branchCenterX + sign * 250;
        const leafW = 190;
        const leafH = 34;

        // Connector from Branch to Leaf
        const blx = branchCenterX + sign * (branchW / 2);
        const bly = branchCenterY;
        const llx = leafCenterX - sign * (leafW / 2);
        const lly = leafCenterY;
        const lc1x = blx + sign * 60;
        const lc2x = llx - sign * 60;

        const leafLink = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        leafLink.setAttribute('d', `M ${blx} ${bly} C ${lc1x} ${bly}, ${lc2x} ${lly}, ${llx} ${lly}`);
        leafLink.setAttribute('fill', 'none');
        leafLink.setAttribute('stroke', '#14b8a6');
        leafLink.setAttribute('stroke-width', '1.6');
        leafLink.setAttribute('stroke-opacity', '0.65');
        leafLink.setAttribute('stroke-dasharray', '4 3');
        leafLink.setAttribute('class', 'mindmap-link');
        linksGroup.appendChild(leafLink);

        // Leaf Card Node
        const lg = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        lg.setAttribute('class', 'mindmap-node');

        const lrect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        lrect.setAttribute('x', leafCenterX - leafW / 2);
        lrect.setAttribute('y', leafCenterY - leafH / 2);
        lrect.setAttribute('width', leafW);
        lrect.setAttribute('height', leafH);
        lrect.setAttribute('rx', '10');
        lrect.setAttribute('fill', '#0f172a');
        lrect.setAttribute('stroke', '#334155');
        lrect.setAttribute('stroke-width', '1.2');

        // Bullet dot
        const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        dot.setAttribute('cx', isRight ? (leafCenterX - leafW / 2 + 14) : (leafCenterX + leafW / 2 - 14));
        dot.setAttribute('cy', leafCenterY);
        dot.setAttribute('r', '3.5');
        dot.setAttribute('fill', '#14b8a6');

        const ltext = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        ltext.setAttribute('x', isRight ? (leafCenterX - leafW / 2 + 26) : (leafCenterX + leafW / 2 - 26));
        ltext.setAttribute('y', leafCenterY + 4);
        ltext.setAttribute('text-anchor', isRight ? 'start' : 'end');
        ltext.setAttribute('fill', '#cbd5e1');
        ltext.setAttribute('font-size', '11');
        ltext.setAttribute('font-weight', '500');
        ltext.textContent = leafText.length > 22 ? leafText.slice(0, 20) + '...' : leafText;

        lg.appendChild(lrect);
        lg.appendChild(dot);
        lg.appendChild(ltext);
        nodesGroup.appendChild(lg);

        curY += slotH;
      });

      if (leaves.length === 0) curY += slotH;
      curY += 24; // margin between branches
    });
  }

  layoutSide(rightBranches, true);
  layoutSide(leftBranches, false);

  // Center Root Node
  const rootG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  rootG.setAttribute('class', 'mindmap-node');

  const rootRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rootRect.setAttribute('x', cx - rootW / 2);
  rootRect.setAttribute('y', cy - rootH / 2);
  rootRect.setAttribute('width', rootW);
  rootRect.setAttribute('height', rootH);
  rootRect.setAttribute('rx', '20');
  rootRect.setAttribute('fill', 'url(#rootGrad)');
  rootRect.setAttribute('stroke', '#34d399');
  rootRect.setAttribute('stroke-width', '2');
  rootRect.setAttribute('filter', 'url(#glow)');

  const rootText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  rootText.setAttribute('x', cx);
  rootText.setAttribute('y', cy + 5);
  rootText.setAttribute('text-anchor', 'middle');
  rootText.setAttribute('fill', '#ffffff');
  rootText.setAttribute('font-size', '14');
  rootText.setAttribute('font-weight', '800');
  rootText.setAttribute('letter-spacing', '0.5');
  rootText.textContent = rootName.length > 22 ? rootName.slice(0, 20) + '...' : rootName;

  rootG.appendChild(rootRect);
  rootG.appendChild(rootText);
  nodesGroup.appendChild(rootG);
}

// ---------------- AI AUDIO PODCAST (KULIKO PRO UNLOCKED) ----------------

function loadPodcastData(podcastObj, set开展Title) {
  const titleDisplay = document.getElementById('podcast-title-display');
  if (titleDisplay) {
    titleDisplay.innerText = `Diskusi Materi: ${set开展Title || 'Cendekia Duo'}`;
  }

  if (podcastObj && podcastObj.dialogue && podcastObj.dialogue.length > 0) {
    podcastDialogue = podcastObj.dialogue;
    renderPodcastTranscript();
  } else {
    // Generate podcast on the fly
    fetchPodcastForCurrentSet();
  }
}

async function fetchPodcastForCurrentSet() {
  if (!currentStudySet) return;
  const container = document.getElementById('podcast-transcript-container');
  if (container) container.innerHTML = '<p class="text-xs text-slate-500 py-4 animate-pulse">Menyiapkan skrip podcast AI...</p>';

  try {
    const res = await fetch(`/api/study-sets/${currentStudySet.id}/podcast`);
    const data = await res.json();
    podcastDialogue = data.dialogue || [];
    renderPodcastTranscript();
  } catch (e) {
    console.error('fetchPodcast error:', e);
  }
}

async function regeneratePodcast() {
  if (!currentStudySet) return;
  stopPodcast();
  const container = document.getElementById('podcast-transcript-container');
  if (container) container.innerHTML = '<p class="text-xs text-slate-500 py-4 animate-pulse">Menulis skrip baru dengan AI...</p>';

  try {
    const res = await fetch(`/api/study-sets/${currentStudySet.id}/podcast/generate`, { method: 'POST' });
    const data = await res.json();
    podcastDialogue = data.dialogue || [];
    renderPodcastTranscript();
    showToast('Skrip podcast baru berhasil digenerate!');
  } catch (e) {
    alert('Gagal regenerate podcast: ' + e.message);
  }
}

function renderPodcastTranscript() {
  const container = document.getElementById('podcast-transcript-container');
  if (!container) return;

  if (!podcastDialogue || podcastDialogue.length === 0) {
    container.innerHTML = '<p class="text-xs text-slate-500">Skrip podcast belum tersedia.</p>';
    return;
  }

  container.innerHTML = podcastDialogue.map((d, idx) => {
    const isLeo = d.speaker.toLowerCase().includes('leo');
    const badgeBg = isLeo ? 'bg-teal-500/20 text-teal-300 border-emerald-500/30' : 'bg-emerald-500/20 text-teal-300 border-emerald-500/30';
    const avatar = isLeo ? '👨‍💻' : '👩‍🏫';

    return `
      <div id="pod-bubble-${idx}" onclick="jumpToPodcastTurn(${idx})" class="card-glow rounded-2xl p-4 border border-slate-800 transition cursor-pointer flex items-start gap-3.5">
        <div class="text-2xl mt-0.5">${avatar}</div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeBg}">${escapeXml(d.speaker)}</span>
          </div>
          <p class="text-xs sm:text-sm text-slate-200 leading-relaxed">${escapeXml(d.text)}</p>
        </div>
      </div>
    `;
  }).join('');
}

function togglePlayPodcast() {
  if (isPodcastPlaying) {
    pausePodcast();
  } else {
    playPodcast();
  }
}

function playPodcast() {
  if (!('speechSynthesis' in window)) {
    alert('Browser Anda tidak mendukung Speech Synthesis.');
    return;
  }

  if (podcastDialogue.length === 0) return;

  isPodcastPlaying = true;
  updatePlayButton(true);
  const eq = document.getElementById('podcast-equalizer');
  if (eq) eq.classList.add('playing');

  speakTurn(podcastTurnIdx);
}

function pausePodcast() {
  isPodcastPlaying = false;
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  updatePlayButton(false);
  const eq = document.getElementById('podcast-equalizer');
  if (eq) eq.classList.remove('playing');
}

function stopPodcast() {
  pausePodcast();
  podcastTurnIdx = 0;
  clearDialogueHighlights();
  updateProgressUI(0);
}

function updatePlayButton(isPlaying) {
  const icon = document.getElementById('podcast-play-icon');
  if (icon) {
    icon.setAttribute('data-lucide', isPlaying ? 'pause' : 'play');
    initIcons();
  }
}

function setPodcastSpeed(speed) {
  podcastSpeed = speed;
  [1.0, 1.25, 1.5, 2.0].forEach(s => {
    const id = s === 1.0 ? 'pod-speed-1' : (s === 1.25 ? 'pod-speed-125' : (s === 1.5 ? 'pod-speed-15' : 'pod-speed-2'));
    const btn = document.getElementById(id);
    if (btn) {
      if (s === speed) {
        btn.className = "px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 text-white transition";
      } else {
        btn.className = "px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-400 transition";
      }
    }
  });

  if (isPodcastPlaying) {
    window.speechSynthesis.cancel();
    speakTurn(podcastTurnIdx);
  }
}

function speakTurn(index) {
  if (!isPodcastPlaying) return;
  if (index >= podcastDialogue.length) {
    stopPodcast();
    showToast('Podcast selesai didengarkan! 🎙️');
    return;
  }

  podcastTurnIdx = index;
  highlightDialogueBubble(index);
  updateProgressUI((index / podcastDialogue.length) * 100);

  const turn = podcastDialogue[index];
  const isLeo = turn.speaker.toLowerCase().includes('leo');

  const utterance = new SpeechSynthesisUtterance(turn.text);
  utterance.rate = podcastSpeed;
  utterance.pitch = isLeo ? 0.95 : 1.15;
  utterance.lang = 'id-ID';

  utterance.onend = () => {
    if (isPodcastPlaying) {
      setTimeout(() => speakTurn(index + 1), 250);
    }
  };

  utterance.onerror = (e) => {
    console.error('Speech error:', e);
    if (isPodcastPlaying) {
      setTimeout(() => speakTurn(index + 1), 300);
    }
  };

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function highlightDialogueBubble(idx) {
  clearDialogueHighlights();
  const el = document.getElementById(`pod-bubble-${idx}`);
  if (el) {
    el.classList.add('dialogue-active');
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function clearDialogueHighlights() {
  document.querySelectorAll('.dialogue-active').forEach(b => b.classList.remove('dialogue-active'));
}

function jumpToPodcastTurn(idx) {
  podcastTurnIdx = idx;
  if (isPodcastPlaying) {
    window.speechSynthesis.cancel();
    speakTurn(idx);
  } else {
    playPodcast();
  }
}

function seekPodcast(val) {
  if (podcastDialogue.length === 0) return;
  const targetIdx = Math.floor((val / 100) * podcastDialogue.length);
  jumpToPodcastTurn(targetIdx);
}

function updateProgressUI(pct) {
  const seek = document.getElementById('podcast-seek');
  const curTime = document.getElementById('podcast-time-cur');
  if (seek) seek.value = pct;
  if (curTime) {
    const totalEst = podcastDialogue.length * 15;
    const curSec = Math.floor((pct / 100) * totalEst);
    const m = Math.floor(curSec / 60);
    const s = curSec % 60;
    curTime.innerText = `${m}:${s < 10 ? '0' : ''}${s}`;
  }
}

// ---------------- TUTOR AI CHAT ----------------

function renderTutorChat(history) {
  const box = document.getElementById('tutor-chat-box');
  if (!box) return;

  if (!history || history.length === 0) {
    box.innerHTML = `
      <div class="text-center py-10 space-y-2">
        <p class="text-xs text-slate-400">Belum ada percakapan dengan Tutor AI.</p>
        <div class="flex flex-wrap justify-center gap-2 pt-2">
          <button onclick="quickTutorAsk('Jelaskan materi ini dengan analogi sederhana')" class="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-[11px] text-teal-300 border border-slate-800 transition">💡 Analogi sederhana</button>
          <button onclick="quickTutorAsk('Buatkan 3 soal latihan baru untuk uji pemahamanku')" class="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-[11px] text-teal-300 border border-slate-800 transition">📝 Buat 3 soal baru</button>
          <button onclick="quickTutorAsk('Apa konsep paling penting dari materi ini?')" class="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-[11px] text-teal-300 border border-slate-800 transition">🎯 Poin terpenting</button>
        </div>
      </div>
    `;
    return;
  }

  box.innerHTML = history.map(msg => {
    const isUser = msg.role === 'user';
    const bg = isUser ? 'bg-emerald-600 text-white ml-auto' : 'bg-slate-900 border border-slate-800 text-slate-200 mr-auto';
    return `
      <div class="max-w-[85%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed ${bg} shadow-md">
        <div class="font-bold text-[10px] opacity-75 mb-1">${isUser ? 'Kamu' : 'Tutor AI'}</div>
        <div>${escapeXml(msg.message)}</div>
      </div>
    `;
  }).join('');

  box.scrollTop = box.scrollHeight;
}

function quickTutorAsk(text) {
  const input = document.getElementById('tutor-chat-input');
  if (input) input.value = text;
  sendTutorMessage();
}

async function sendTutorMessage() {
  const input = document.getElementById('tutor-chat-input');
  if (!input || !currentStudySet) return;
  const msg = input.value.trim();
  if (!msg) return;

  input.value = '';

  const box = document.getElementById('tutor-chat-box');
  if (box) {
    box.innerHTML += `
      <div class="max-w-[85%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed bg-emerald-600 text-white ml-auto shadow-md">
        <div class="font-bold text-[10px] opacity-75 mb-1">Kamu</div>
        <div>${escapeXml(msg)}</div>
      </div>
      <div id="tutor-typing" class="max-w-[85%] rounded-2xl p-3.5 text-xs bg-slate-900 border border-slate-800 text-slate-400 mr-auto flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-teal-400 animate-ping"></span>
        <span>Tutor AI sedang berpikir...</span>
      </div>
    `;
    box.scrollTop = box.scrollHeight;
  }

  try {
    const res = await fetch(`/api/study-sets/${currentStudySet.id}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg })
    });
    if (!res.ok) throw new Error('Gagal chat tutor');
    const data = await res.json();

    const typing = document.getElementById('tutor-typing');
    if (typing) typing.remove();

    if (box) {
      box.innerHTML += `
        <div class="max-w-[85%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed bg-slate-900 border border-slate-800 text-slate-200 mr-auto shadow-md">
          <div class="font-bold text-[10px] text-cyan-400 mb-1">Tutor AI</div>
          <div>${escapeXml(data.reply)}</div>
        </div>
      `;
      box.scrollTop = box.scrollHeight;
    }
  } catch (e) {
    console.error('sendTutorMessage error:', e);
    const typing = document.getElementById('tutor-typing');
    if (typing) typing.innerText = 'Gagal memuat jawaban AI.';
  }
}

// ---------------- EXPORT SUITE ----------------

function toggleExportMenu() {
  const menu = document.getElementById('export-dropdown-menu');
  if (menu) menu.classList.toggle('hidden');
}

function triggerExport(format) {
  if (!currentStudySet) return;
  toggleExportMenu();
  window.open(`/api/study-sets/${currentStudySet.id}/export?format=${format}`, '_blank');
  showToast(`Materi diekspor ke format ${format.toUpperCase()}`);
}

async function deleteCurrentSet() {
  if (!currentStudySet) return;
  if (!confirm(`Yakin ingin menghapus materi '${currentStudySet.title}'?`)) return;

  try {
    const res = await fetch(`/api/study-sets/${currentStudySet.id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Gagal menghapus');
    showToast('Materi berhasil dihapus.');
    showView('library');
  } catch (e) {
    alert('Error: ' + e.message);
  }
}

// ---------------- CLAUDE MCP MODAL ----------------

function openMcpModal() {
  const modal = document.getElementById('mcp-modal');
  if (modal) modal.classList.remove('hidden');
}

function closeMcpModal() {
  const modal = document.getElementById('mcp-modal');
  if (modal) modal.classList.add('hidden');
}

function copyModalMcpUrl() {
  const inp = document.getElementById('modal-mcp-url');
  if (!inp) return;
  navigator.clipboard.writeText(inp.value);
  showToast('URL MCP tersalin ke clipboard!');
}

// ---------------- GLOBAL SEARCH ----------------

function handleGlobalSearch(query) {
  const q = query.trim().toLowerCase();
  if (!q) {
    if (currentView === 'library') renderStudySetsGrid(allStudySets);
    return;
  }

  if (currentView !== 'library') {
    showView('library');
  }

  const filtered = allStudySets.filter(s => {
    return (s.title && s.title.toLowerCase().includes(q)) || (s.subject_name && s.subject_name.toLowerCase().includes(q));
  });

  renderStudySetsGrid(filtered);
}

// ---------------- STUDY BACKGROUND PING ----------------

setInterval(async () => {
  try {
    await fetch('/api/study-pings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seconds: 60 })
    });
  } catch (e) {
    // silent
  }
}, 60000);

// ---------------- KEYBOARD SHORTCUTS ----------------

document.addEventListener('keydown', (e) => {
  // If user is typing in an input or textarea, ignore shortcuts
  if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

  if (currentView === 'study' && currentStudyTab === 'flashcards') {
    if (e.code === 'Space') {
      e.preventDefault();
      flipFlashcard();
    } else if (e.key === '1') {
      rateCurrentCard(1);
    } else if (e.key === '2') {
      rateCurrentCard(2);
    } else if (e.key === '3') {
      rateCurrentCard(3);
    } else if (e.key === '4') {
      rateCurrentCard(4);
    } else if (e.key === 'ArrowLeft') {
      prevFlashcard();
    } else if (e.key === 'ArrowRight') {
      nextFlashcard();
    }
  }
});

// Helper: Escape XML
function escapeXml(unsafe) {
  if (unsafe === null || unsafe === undefined) return '';
  return String(unsafe).replace(/[<>&'"]/g, function (c) {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case "\'": return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}


// ==========================================
// KULIKO DEEP DOCUMENT READER MODULE
// ==========================================
let currentDeepDocText = '';
let isDeepDocTTSSpeaking = false;

async function loadDeepDocument(setId, forceRegen = false) {
  const loadingEl = document.getElementById('deepdoc-loading');
  const contentEl = document.getElementById('deepdoc-content');
  const quickNav = document.getElementById('deepdoc-quick-nav');
  const wordCountEl = document.getElementById('deepdoc-word-count');
  const readTimeEl = document.getElementById('deepdoc-read-time');

  if (loadingEl) loadingEl.classList.remove('hidden');
  if (contentEl) contentEl.classList.add('hidden');
  if (quickNav) quickNav.innerHTML = '';

  try {
    const url = forceRegen 
      ? `/api/study-sets/${setId}/deep-doc/generate`
      : `/api/study-sets/${setId}/deep-doc`;
    const method = forceRegen ? 'POST' : 'GET';
    const res = await fetch(url, { method });
    if (!res.ok) throw new Error("Gagal memuat deep document");
    const data = await res.json();
    currentDeepDocText = data.deep_doc || '';

    // Word count & read time
    const words = currentDeepDocText.trim().split(/\s+/).filter(Boolean).length;
    const readMinutes = Math.max(1, Math.ceil(words / 180));
    if (wordCountEl) wordCountEl.innerHTML = `<i data-lucide="align-left" class="w-3.5 h-3.5 text-emerald-400"></i> ${words.toLocaleString()} kata`;
    if (readTimeEl) readTimeEl.innerHTML = `<i data-lucide="clock" class="w-3.5 h-3.5 text-teal-400"></i> Estimasi baca: ~${readMinutes} menit`;

    // Render markdown
    if (contentEl) {
      if (window.marked) {
        contentEl.innerHTML = marked.parse(currentDeepDocText);
      } else {
        contentEl.innerText = currentDeepDocText;
      }
      contentEl.classList.remove('hidden');
    }

    // Build Quick Nav chips from H2 headings
    if (quickNav) {
      const headings = contentEl.querySelectorAll('h2');
      quickNav.innerHTML = '';
      headings.forEach((h, idx) => {
        const title = h.innerText.replace(/^\d+[\.\)]\s*/, '').trim();
        const chip = document.createElement('button');
        chip.className = "px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-emerald-500/40 transition truncate max-w-[180px]";
        chip.innerText = title.length > 22 ? title.slice(0, 20) + '...' : title;
        chip.onclick = () => {
          h.scrollIntoView({ behavior: 'smooth', block: 'start' });
        };
        quickNav.appendChild(chip);
      });
    }

    if (window.lucide) lucide.createIcons();
  } catch (err) {
    console.error("Error loading deep doc:", err);
    if (contentEl) {
      contentEl.innerHTML = `<div class="p-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">Gagal memuat Dokumen Lengkap: ${err.message}</div>`;
      contentEl.classList.remove('hidden');
    }
  } finally {
    if (loadingEl) loadingEl.classList.add('hidden');
  }
}

function copyDeepDocMarkdown() {
  if (!currentDeepDocText) return;
  navigator.clipboard.writeText(currentDeepDocText).then(() => {
    alert("Dokumen lengkap berhasil disalin ke clipboard!");
  });
}

function downloadDeepDocMarkdown() {
  if (!currentDeepDocText) return;
  const title = currentSet ? (currentStudySet || currentSet).title.replace(/[^a-zA-Z0-9_-]/g, '_') : 'dokumen';
  const blob = new Blob([currentDeepDocText], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title}_Deep_Document.md`;
  a.click();
  URL.revokeObjectURL(url);
}

function regenerateDeepDoc() {
  if (!currentStudySet && !window.currentSet) return;
  if (confirm("Bedah ulang materi ini? Proses akan memindai seluruh dokumen sumber kembali.")) {
    loadDeepDocument((currentStudySet || currentSet).id, true);
  }
}

function toggleDeepDocTTS() {
  if (!('speechSynthesis' in window)) {
    alert("Browser tidak mendukung Web Speech API");
    return;
  }
  const btnText = document.getElementById('deepdoc-tts-text');

  if (isDeepDocTTSSpeaking) {
    window.speechSynthesis.cancel();
    isDeepDocTTSSpeaking = false;
    if (btnText) btnText.innerText = "Baca Bersuara";
  } else {
    if (!currentDeepDocText) return;
    window.speechSynthesis.cancel();
    const cleanText = currentDeepDocText.replace(/[#*`_>~\[\]\(\)]/g, ' ').slice(0, 5000);
    const utter = new SpeechSynthesisUtterance(cleanText);
    utter.lang = 'id-ID';
    utter.rate = 1.0;
    utter.onend = () => {
      isDeepDocTTSSpeaking = false;
      if (btnText) btnText.innerText = "Baca Bersuara";
    };
    utter.onerror = () => {
      isDeepDocTTSSpeaking = false;
      if (btnText) btnText.innerText = "Baca Bersuara";
    };
    window.speechSynthesis.speak(utter);
    isDeepDocTTSSpeaking = true;
    if (btnText) btnText.innerText = "Hentikan Suara";
  }
}

// ==========================================

// ==================== NOTEBOOKLM VIDEO CONFIGURATION & ANIMATION ====================
let videoConfigState = {
  formatType: 'explainer',
  sources: ['summary', 'deep_doc', 'flashcards'],
  tone: 'edukatif',
  withAnimation: true
};

function openVideoConfigModal() {
  const m = document.getElementById('modal-video-config');
  if (m) m.classList.remove('hidden');
  initIcons();
}

function closeVideoConfigModal() {
  const m = document.getElementById('modal-video-config');
  if (m) m.classList.add('hidden');
}

function setVideoConfigFormat(fmt) {
  videoConfigState.formatType = fmt;
  const btnExp = document.getElementById('vconfig-fmt-explainer');
  const btnShort = document.getElementById('vconfig-fmt-short');
  if (fmt === 'explainer') {
    if (btnExp) btnExp.className = "p-2.5 rounded-xl border border-emerald-500 bg-emerald-500/10 text-emerald-400 font-semibold flex items-center justify-center gap-2 transition";
    if (btnShort) btnShort.className = "p-2.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-400 font-medium flex items-center justify-center gap-2 transition hover:bg-slate-800";
  } else {
    if (btnExp) btnExp.className = "p-2.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-400 font-medium flex items-center justify-center gap-2 transition hover:bg-slate-800";
    if (btnShort) btnShort.className = "p-2.5 rounded-xl border border-emerald-500 bg-emerald-500/10 text-emerald-400 font-semibold flex items-center justify-center gap-2 transition";
  }
}

async function submitVideoConfigGeneration() {
  const activeSet = currentStudySet || window.currentSet;
  const setId = activeSet ? activeSet.id : null;
  if (!setId) {
    showToast("Silakan buka materi pembelajaran terlebih dahulu.", "warning");
    return;
  }

  const srcSummary = document.getElementById('vconfig-src-summary')?.checked;
  const srcDeepdoc = document.getElementById('vconfig-src-deepdoc')?.checked;
  const srcFlashcards = document.getElementById('vconfig-src-flashcards')?.checked;

  const sources = [];
  if (srcSummary) sources.push('summary');
  if (srcDeepdoc) sources.push('deep_doc');
  if (srcFlashcards) sources.push('flashcards');

  if (sources.length === 0) {
    showToast("Pilih minimal satu sumber materi (sources)!", "warning");
    return;
  }

  const prompt = document.getElementById('vconfig-custom-prompt')?.value?.trim() || "";
  const tone = document.getElementById('vconfig-tone')?.value || "edukatif";
  const withAnim = document.getElementById('vconfig-anim-enabled')?.checked ?? true;
  const formatType = videoConfigState.formatType || 'explainer';

  const btn = document.getElementById('vconfig-btn-submit');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i><span>Memproduksi Storyboard & Animasi AI...</span>`;
    initIcons();
  }

  try {
    const res = await fetch(`/api/study-sets/${setId}/video/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        format_type: formatType,
        prompt: prompt,
        sources: sources,
        tone: tone,
        with_animation: withAnim
      })
    });
    if (!res.ok) throw new Error("Gagal memproduksi video");
    const data = await res.json();
    videoState.storyboard = data.storyboard || [];
    videoState.formatType = formatType;
    videoState.currentSceneIndex = 0;

    setVideoFormat(formatType);
    renderVideoScenesNav();
    renderCurrentVideoScene();
    closeVideoConfigModal();
    showToast("Video Overview AI ala NotebookLM berhasil dibuat!", "success");
  } catch (err) {
    showToast("Error membuat video: " + err.message, "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i data-lucide="sparkles" class="w-4 h-4"></i><span>Mulai Buat Video Animasi</span>`;
      initIcons();
    }
  }
}

// NOTEBOOKLM VIDEO OVERVIEW STUDIO MODULE
// ==========================================
let videoState = {
  storyboard: [],
  currentSceneIndex: 0,
  isPlaying: false,
  formatType: 'explainer',
  speed: 1.0,
  timer: null,
  currentUtterance: null
};

async function loadVideoStoryboard(setId, forceRegen = false) {
  try {
    const url = forceRegen
      ? `/api/study-sets/${setId}/video/generate`
      : `/api/study-sets/${setId}/video?format_type=${videoState.formatType}`;
    const method = forceRegen ? 'POST' : 'GET';
    const body = forceRegen ? JSON.stringify({ format_type: videoState.formatType }) : null;
    const headers = forceRegen ? { 'Content-Type': 'application/json' } : {};

    const res = await fetch(url, { method, headers, body });
    if (!res.ok) throw new Error("Gagal mengambil data video");
    const data = await res.json();
    videoState.storyboard = data.storyboard || [];
    videoState.currentSceneIndex = 0;

    renderVideoScenesNav();
    renderCurrentVideoScene();
  } catch (err) {
    console.error("Error loading video:", err);
  }
}

function renderVideoScenesNav() {
  const container = document.getElementById('video-scenes-nav');
  if (!container) return;
  container.innerHTML = '';

  videoState.storyboard.forEach((scene, idx) => {
    const dot = document.createElement('button');
    dot.className = `w-3 h-3 rounded-full transition-all duration-300 ${
      idx === videoState.currentSceneIndex ? 'bg-emerald-500 scale-125 ring-2 ring-emerald-500/50' : 'bg-slate-800 hover:bg-slate-700'
    }`;
    dot.title = `Babak ${idx+1}: ${scene.title || ''}`;
    dot.onclick = () => {
      jumpToVideoScene(idx);
    };
    container.appendChild(dot);
  });
}

function renderCurrentVideoScene() {
  if (!videoState.storyboard.length) return;
  const scene = videoState.storyboard[videoState.currentSceneIndex];
  if (!scene) return;

  const badgeEl = document.getElementById('video-slide-badge');
  const sceneNumEl = document.getElementById('video-slide-scene-num');
  const titleEl = document.getElementById('video-slide-title');
  const subtitleEl = document.getElementById('video-slide-subtitle');
  const pointsEl = document.getElementById('video-slide-points');
  const narrationEl = document.getElementById('video-slide-narration');
  const glow1 = document.getElementById('video-ambient-glow');
  const glow2 = document.getElementById('video-ambient-glow-2');

  const accentColorMap = {
    indigo: { badge: 'bg-teal-500/20 text-teal-400 border-emerald-500/30', glow: 'bg-teal-500/20', cardBorder: 'border-l-emerald-500' },
    cyan: { badge: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30', glow: 'bg-cyan-500/20', cardBorder: 'border-l-cyan-500' },
    emerald: { badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', glow: 'bg-emerald-500/20', cardBorder: 'border-l-emerald-500' },
    amber: { badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30', glow: 'bg-amber-500/20', cardBorder: 'border-l-amber-500' },
    rose: { badge: 'bg-rose-500/20 text-rose-400 border-rose-500/30', glow: 'bg-rose-500/20', cardBorder: 'border-l-rose-500' },
    purple: { badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', glow: 'bg-emerald-500/20', cardBorder: 'border-l-teal-500' }
  };
  const theme = accentColorMap[scene.accent_color] || accentColorMap.emerald;

  if (badgeEl) {
    badgeEl.className = `px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase border ${theme.badge}`;
    badgeEl.innerText = scene.badge || `Babak ${scene.scene_number || videoState.currentSceneIndex + 1}`;
  }
  if (sceneNumEl) sceneNumEl.innerText = `Babak ${videoState.currentSceneIndex + 1} / ${videoState.storyboard.length}`;
  if (titleEl) titleEl.innerText = scene.title || '';
  if (subtitleEl) subtitleEl.innerText = scene.subtitle || '';

  if (glow1) glow1.className = `absolute -top-32 -left-32 w-96 h-96 rounded-full blur-3xl pointer-events-none transition-all duration-700 ${theme.glow}`;
  if (glow2) glow2.className = `absolute -bottom-32 -right-32 w-96 h-96 rounded-full blur-3xl pointer-events-none transition-all duration-700 ${theme.glow}`;

  if (pointsEl) {
    pointsEl.innerHTML = '';
    const points = scene.key_points || [];
    points.forEach((pt, pIdx) => {
      const card = document.createElement('div');
      card.className = `kinetic-bullet p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 ${theme.cardBorder} border-l-4 space-y-1 transform transition hover:-translate-y-1 shadow-lg`;
      card.style.animationDelay = `${(pIdx * 0.12).toFixed(2)}s`;
      card.innerHTML = `
        <span class="text-[10px] font-mono text-slate-400 font-bold uppercase">Poin 0${pIdx+1}</span>
        <p class="text-xs sm:text-sm font-semibold text-slate-200 leading-snug">${escapeXml(pt)}</p>
      `;
      pointsEl.appendChild(card);
    });
  }

  // Populate dynamic bouncing audio equalizer
  const eq = document.getElementById('video-equalizer');
  if (eq) {
    eq.innerHTML = Array.from({ length: 16 }).map((_, i) => 
      `<div class="waveform-bar" style="animation-delay: ${(i * 0.05).toFixed(2)}s"></div>`
    ).join('');
  }
  
  if (narrationEl) {
    narrationEl.innerText = scene.narration || '';
  }

  // Progress Bar
  const total = videoState.storyboard.length;
  const pct = ((videoState.currentSceneIndex + 1) / total) * 100;
  const bar = document.getElementById('video-progress-bar');
  if (bar) bar.style.width = `${pct}%`;

  const curTime = document.getElementById('video-time-current');
  const totTime = document.getElementById('video-time-total');
  if (curTime) curTime.innerText = `0:${String((videoState.currentSceneIndex + 1) * 10).padStart(2, '0')}`;
  if (totTime) totTime.innerText = `0:${String(total * 10).padStart(2, '0')}`;

  renderVideoScenesNav();
  if (window.lucide) lucide.createIcons();
}

function togglePlayVideo() {
  if (videoState.isPlaying) {
    stopVideoPlayback();
  } else {
    startVideoPlayback();
  }
}

function startVideoPlayback() {
  videoState.isPlaying = true;
  updatePlayButtonUI(true);
  const eq = document.getElementById('video-equalizer'); if (eq) eq.classList.add('playing-video');
  playCurrentSceneVoice();
}

function stopVideoPlayback() {
  videoState.isPlaying = false;
  updatePlayButtonUI(false);
  const eq = document.getElementById('video-equalizer'); if (eq) eq.classList.remove('playing-video');
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

function updatePlayButtonUI(playing) {
  const icon = document.getElementById('btn-video-play-icon');
  if (icon) {
    icon.setAttribute('data-lucide', playing ? 'pause' : 'play');
    if (window.lucide) lucide.createIcons();
  }
}

function playCurrentSceneVoice() {
  if (!videoState.isPlaying) return;
  const scene = videoState.storyboard[videoState.currentSceneIndex];
  if (!scene) return;

  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const narration = scene.narration || scene.title;
    const utter = new SpeechSynthesisUtterance(narration);
    utter.lang = 'id-ID';
    utter.rate = videoState.speed;

    const narrationEl = document.getElementById('video-slide-narration');

    utter.onboundary = (e) => {
      if (narrationEl && e.name === 'word') {
        const spoken = narration.slice(0, e.charIndex + e.charLength);
        const remainder = narration.slice(e.charIndex + e.charLength);
        narrationEl.innerHTML = `<span class="text-teal-400 font-bold">${escapeXml(spoken)}</span><span class="text-slate-400">${escapeXml(remainder)}</span>`;
      }
    };

    utter.onend = () => {
      if (videoState.isPlaying) {
        if (videoState.currentSceneIndex < videoState.storyboard.length - 1) {
          videoState.currentSceneIndex++;
          renderCurrentVideoScene();
          setTimeout(playCurrentSceneVoice, 600);
        } else {
          stopVideoPlayback();
          videoState.currentSceneIndex = 0;
          renderCurrentVideoScene();
        }
      }
    };

    utter.onerror = () => {
      stopVideoPlayback();
    };

    window.speechSynthesis.speak(utter);
  } else {
    const dur = (scene.duration_sec || 8) * 1000 / videoState.speed;
    setTimeout(() => {
      if (videoState.isPlaying) {
        if (videoState.currentSceneIndex < videoState.storyboard.length - 1) {
          videoState.currentSceneIndex++;
          renderCurrentVideoScene();
          startVideoPlayback();
        } else {
          stopVideoPlayback();
        }
      }
    }, dur);
  }
}

function prevVideoScene() {
  if (videoState.currentSceneIndex > 0) {
    videoState.currentSceneIndex--;
    renderCurrentVideoScene();
    if (videoState.isPlaying) playCurrentSceneVoice();
  }
}

function nextVideoScene() {
  if (videoState.currentSceneIndex < videoState.storyboard.length - 1) {
    videoState.currentSceneIndex++;
    renderCurrentVideoScene();
    if (videoState.isPlaying) playCurrentSceneVoice();
  }
}

function replayVideoScene() {
  renderCurrentVideoScene();
  if (videoState.isPlaying) playCurrentSceneVoice();
}

function jumpToVideoScene(idx) {
  videoState.currentSceneIndex = idx;
  renderCurrentVideoScene();
  if (videoState.isPlaying) playCurrentSceneVoice();
}

function seekVideoProgress(e) {
  if (!videoState || !videoState.storyboard || videoState.storyboard.length === 0) return;
  const rect = e.currentTarget.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const ratio = Math.max(0, Math.min(1, clickX / rect.width));
  const targetIdx = Math.min(videoState.storyboard.length - 1, Math.floor(ratio * videoState.storyboard.length));
  jumpToVideoScene(targetIdx);
}

function setVideoSpeed(spd) {
  videoState.speed = spd;
  [1.0, 1.25, 1.5].forEach(s => {
    const id = `speed-${String(s).replace('.', '')}`;
    const btn = document.getElementById(id);
    if (btn) {
      if (s === spd) {
        btn.className = "px-2 py-1 rounded-lg font-semibold bg-slate-800 text-white";
      } else {
        btn.className = "px-2 py-1 rounded-lg font-semibold text-slate-400 hover:text-white";
      }
    }
  });
  if (videoState.isPlaying) playCurrentSceneVoice();
}

function setVideoFormat(fmt) {
  videoState.formatType = fmt;
  const explainerBtn = document.getElementById('btn-video-explainer');
  const shortBtn = document.getElementById('btn-video-short');
  const stage = document.getElementById('video-stage-container');

  if (fmt === 'explainer') {
    if (explainerBtn) explainerBtn.className = "px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-600 text-white transition flex items-center gap-1.5";
    if (shortBtn) shortBtn.className = "px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition flex items-center gap-1.5";
    if (stage) {
      stage.className = "w-full max-w-4xl aspect-video rounded-2xl border border-slate-800/80 bg-[#090d16] relative overflow-hidden shadow-2xl flex flex-col justify-between p-6 sm:p-10 select-none transition-all duration-500";
    }
  } else {
    if (explainerBtn) explainerBtn.className = "px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition flex items-center gap-1.5";
    if (shortBtn) shortBtn.className = "px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-600 text-white transition flex items-center gap-1.5";
    if (stage) {
      stage.className = "w-full max-w-xs aspect-[9/16] rounded-2xl border border-slate-800/80 bg-[#090d16] relative overflow-hidden shadow-2xl flex flex-col justify-between p-4 select-none transition-all duration-500";
    }
  }
}

function regenerateVideo() {
  if (!currentStudySet && !window.currentSet) return;
  if (confirm(`Generate ulang storyboard video (${videoState.formatType.toUpperCase()}) menggunakan AI?`)) {
    loadVideoStoryboard((currentStudySet || currentSet).id, true);
  }
}

async function downloadVideoMP4() {
  if (!currentStudySet && !window.currentSet) return;
  const btn = document.getElementById('btn-render-mp4');
  const text = document.getElementById('btn-render-text');
  if (text) text.innerText = "Merender FFmpeg MP4...";
  if (btn) btn.disabled = true;

  try {
    const res = await fetch(`/api/study-sets/${(currentStudySet || currentSet).id}/video/render-mp4`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ format_type: videoState.formatType, with_animation: true })
    });
    if (!res.ok) throw new Error("Gagal merender video di server");
    const data = await res.json();
    if (data.video_url) {
      const a = document.createElement('a');
      a.href = data.video_url;
      a.download = `${(currentStudySet || currentSet).title.replace(/[^a-zA-Z0-9_-]/g, '_')}_${videoState.formatType}.mp4`;
      a.click();
    }
  } catch (err) {
    alert("Gagal merender video: " + err.message);
  } finally {
    if (text) text.innerText = "Unduh Video MP4";
    if (btn) btn.disabled = false;
  }
}

function toggleVideoFullscreen() {
  const stage = document.getElementById('video-stage-container');
  if (!stage) return;
  if (!document.fullscreenElement) {
    stage.requestFullscreen().catch(err => alert("Fullscreen error: " + err.message));
  } else {
    document.exitFullscreen();
  }
}



// ==================== AUTH & USER PROFILE (KULIKO REPLICA) ====================
let currentUser = null;
let loginPasswordMode = false;

async function initAuth() {
  if (localStorage.getItem('cendekia_session') === 'logged_out') {
    currentUser = null;
    updateUserNavbarUI();
    return;
  }
  try {
    const res = await fetch('/api/auth/me');
    if (res.ok) {
      const data = await res.json();
      if (data && data.authenticated && data.user) {
        currentUser = data.user;
      } else {
        currentUser = null;
      }
    } else {
      currentUser = null;
    }
  } catch (err) {
    currentUser = null;
    console.warn("Auth check failed:", err);
  }
  updateUserNavbarUI();
}

function updateUserNavbarUI() {
  const loggedInContainer = document.getElementById('auth-logged-in');
  const loggedOutContainer = document.getElementById('auth-logged-out');
  const protectedLinks = document.getElementById('nav-protected-links');
  const landingBtn = document.getElementById('nav-btn-landing');
  const mobileLandingBtn = document.getElementById('mobile-nav-btn-landing');
  const mobileProtectedLinks = document.getElementById('mobile-protected-links');
  const mobileGuestLinks = document.getElementById('mobile-guest-links');
  const streakBadge = document.getElementById('nav-streak-badge');
  const streakCount = document.getElementById('nav-streak-count');
  const searchContainer = document.getElementById('nav-search-container');

  if (currentUser && currentUser.email) {
    // Hide Beranda completely from desktop navbar & mobile drawer when logged in
    if (landingBtn) {
      landingBtn.classList.add('hidden');
      landingBtn.classList.remove('flex');
    }
    if (mobileLandingBtn) {
      mobileLandingBtn.classList.add('hidden');
      mobileLandingBtn.classList.remove('flex');
    }
    if (protectedLinks) {
      protectedLinks.classList.remove('hidden');
      protectedLinks.classList.add('flex');
    }
    if (mobileProtectedLinks) {
      mobileProtectedLinks.classList.remove('hidden');
    }
    if (mobileGuestLinks) {
      mobileGuestLinks.classList.add('hidden');
    }
    if (loggedInContainer) {
      loggedInContainer.classList.remove('hidden');
      loggedInContainer.classList.add('flex');
    }
    if (loggedOutContainer) {
      loggedOutContainer.classList.add('hidden');
      loggedOutContainer.classList.remove('flex');
    }
    if (streakBadge) {
      streakBadge.classList.remove('hidden');
      streakBadge.classList.add('flex');
    }
    if (searchContainer) {
      if (currentView === 'landing') {
        searchContainer.classList.add('hidden');
      } else {
        searchContainer.classList.remove('hidden');
      }
    }

    const nameEl = document.getElementById('nav-user-name');
    const avatarEl = document.getElementById('nav-user-avatar');
    const dropdownName = document.getElementById('dropdown-user-fullname');
    const dropdownEmail = document.getElementById('dropdown-user-email');

    const fullName = `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim() || currentUser.email.split('@')[0];
    const initials = ((currentUser.first_name ? currentUser.first_name[0] : '') + (currentUser.last_name ? currentUser.last_name[0] : '')).toUpperCase() || 'HB';

    if (nameEl) nameEl.textContent = fullName;
    if (dropdownName) dropdownName.textContent = fullName;
    if (dropdownEmail) dropdownEmail.textContent = currentUser.email;

    if (avatarEl) {
      if (currentUser.avatar_url && (currentUser.avatar_url.startsWith('http') || currentUser.avatar_url.startsWith('data:'))) {
        avatarEl.innerHTML = `<img src="${encodeURI(currentUser.avatar_url)}" class="w-full h-full object-cover rounded-lg" />`;
      } else {
        avatarEl.textContent = initials;
      }
    }
  } else {
    // Show Beranda when logged out
    if (landingBtn) {
      landingBtn.classList.remove('hidden');
      landingBtn.classList.add('flex');
    }
    if (mobileLandingBtn) {
      mobileLandingBtn.classList.remove('hidden');
      mobileLandingBtn.classList.add('flex');
    }
    if (protectedLinks) {
      protectedLinks.classList.add('hidden');
      protectedLinks.classList.remove('flex');
    }
    if (mobileProtectedLinks) {
      mobileProtectedLinks.classList.add('hidden');
    }
    if (mobileGuestLinks) {
      mobileGuestLinks.classList.remove('hidden');
    }
    if (loggedInContainer) {
      loggedInContainer.classList.add('hidden');
      loggedInContainer.classList.remove('flex');
    }
    if (loggedOutContainer) {
      loggedOutContainer.classList.remove('hidden');
      loggedOutContainer.classList.add('flex');
    }
    if (streakBadge) {
      streakBadge.classList.add('hidden');
      streakBadge.classList.remove('flex');
    }
    if (streakCount) {
      streakCount.innerText = '0';
    }
    if (searchContainer) {
      searchContainer.classList.add('hidden');
      searchContainer.classList.remove('lg:flex');
    }
  }
  initIcons();
}

function toggleUserDropdown(e) {
  if (e && e.stopPropagation) e.stopPropagation();
  const menu = document.getElementById('user-dropdown-menu');
  if (menu) menu.classList.toggle('hidden');
}

function closeUserDropdown() {
  const menu = document.getElementById('user-dropdown-menu');
  if (menu) menu.classList.add('hidden');
}

window.addEventListener('click', (e) => {
  const btn = document.getElementById('user-profile-btn');
  const menu = document.getElementById('user-dropdown-menu');
  if (btn && menu && !btn.contains(e.target) && !menu.contains(e.target)) {
    menu.classList.add('hidden');
  }
});

async function handleLogout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch (err) {
    console.error("Logout request failed:", err);
  }
  document.cookie = "session_user_id=logged_out; path=/; max-age=0;";
  localStorage.setItem('cendekia_session', 'logged_out');
  currentUser = null;
  closeUserDropdown();
  updateUserNavbarUI();

  // Reset streak values and calendar
  const streakBadge = document.getElementById('nav-streak-badge');
  if (streakBadge) {
    streakBadge.classList.add('hidden');
    streakBadge.classList.remove('flex');
  }
  const streakCount = document.getElementById('nav-streak-count');
  if (streakCount) streakCount.innerText = '0';
  const dashStreakDays = document.getElementById('dash-streak-days');
  const dashStreakTitle = document.getElementById('dash-streak-title');
  const dashStreakStatus = document.getElementById('dash-streak-status');
  if (dashStreakDays) dashStreakDays.innerText = '0';
  if (dashStreakTitle) dashStreakTitle.innerText = '0 DAY STREAK';
  if (dashStreakStatus) dashStreakStatus.innerText = 'Mulai belajar hari ini!';
  const streakCal = document.getElementById('dash-streak-calendar');
  if (streakCal) streakCal.innerHTML = '';

  showToast('Berhasil keluar. Sesi telah diakhiri dengan aman.', 'success');
  showView('landing');
}

function openLoginModal(defaultTab = 'login') {
  const m = document.getElementById('modal-login');
  if (m) m.classList.remove('hidden');
  switchAuthModalTab(defaultTab);
  loadQuickAccounts();
  initIcons();
}

function closeLoginModal() {
  const m = document.getElementById('modal-login');
  if (m) m.classList.add('hidden');
}

function switchAuthModalTab(tab) {
  const btnLogin = document.getElementById('auth-tab-btn-login');
  const btnReg = document.getElementById('auth-tab-btn-register');
  const contentLogin = document.getElementById('auth-tab-content-login');
  const contentReg = document.getElementById('auth-tab-content-register');
  const title = document.getElementById('auth-modal-title');
  const subtitle = document.getElementById('auth-modal-subtitle');

  if (tab === 'register') {
    if (btnLogin) {
      btnLogin.className = "flex-1 py-2 rounded-xl text-xs sm:text-sm font-semibold transition text-slate-400 hover:text-white";
    }
    if (btnReg) {
      btnReg.className = "flex-1 py-2 rounded-xl text-xs sm:text-sm font-semibold transition bg-emerald-600 text-white shadow";
    }
    if (contentLogin) {
      contentLogin.classList.add('hidden');
      contentLogin.style.display = 'none';
    }
    if (contentReg) {
      contentReg.classList.remove('hidden');
      contentReg.style.display = 'block';
    }
    if (title) title.textContent = "Daftar Akun Baru Cendekia";
    if (subtitle) subtitle.textContent = "Mulai belajar lebih cerdas dengan AI — 100% Gratis";
  } else {
    if (btnLogin) {
      btnLogin.className = "flex-1 py-2 rounded-xl text-xs sm:text-sm font-semibold transition bg-emerald-600 text-white shadow";
    }
    if (btnReg) {
      btnReg.className = "flex-1 py-2 rounded-xl text-xs sm:text-sm font-semibold transition text-slate-400 hover:text-white";
    }
    if (contentLogin) {
      contentLogin.classList.remove('hidden');
      contentLogin.style.display = 'block';
    }
    if (contentReg) {
      contentReg.classList.add('hidden');
      contentReg.style.display = 'none';
    }
    if (title) title.textContent = "Selamat Datang di Cendekia";
    if (subtitle) subtitle.textContent = "Platform Belajar Cerdas AI — 100% Gratis Tanpa Batasan";
  }
  initIcons();
}

async function loadQuickAccounts() { /* Privacy: no public account exposure */ }

async function handleSwitchAccount(userId) {
  try {
    const res = await fetch('/api/auth/switch-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Gagal beralih akun");
    }
    const data = await res.json();
    localStorage.removeItem('cendekia_session');
    currentUser = data.user;
    updateUserNavbarUI();
    closeLoginModal();
    showToast(`Beralih ke akun ${currentUser.first_name || currentUser.email}`, 'success');
    if (currentView === 'settings') populateProfileForm();
    else showView('dashboard');
  } catch (err) {
    alert(err.message);
  }
}

function togglePasswordVisibility(inputId) {
  const el = document.getElementById(inputId);
  if (!el) return;
  if (el.type === 'password') {
    el.type = 'text';
  } else {
    el.type = 'password';
  }
}

let currentGoogleAuthData = {
  email: '',
  name: '',
  otp_code: ''
};

function promptGoogleSignIn() {
  const m = document.getElementById('modal-google-chooser');
  if (m) m.classList.remove('hidden');
  const loginModal = document.getElementById('modal-login');
  if (loginModal) loginModal.classList.add('hidden');
  showGoogleInputScreen();
}

function closeGoogleChooserModal() {
  const m = document.getElementById('modal-google-chooser');
  if (m) m.classList.add('hidden');
}

function showGoogleInputScreen() {
  const sInput = document.getElementById('gchooser-screen-input');
  const sOtp = document.getElementById('gchooser-screen-otp');
  if (sInput) sInput.classList.remove('hidden');
  if (sOtp) sOtp.classList.add('hidden');
  const emailInput = document.getElementById('gchooser-input-email');
  if (emailInput) {
    emailInput.value = '';
    emailInput.focus();
  }
  initIcons();
}

function showGoogleOtpScreen(email, name) {
  const sInput = document.getElementById('gchooser-screen-input');
  const sOtp = document.getElementById('gchooser-screen-otp');
  if (sInput) sInput.classList.add('hidden');
  if (sOtp) sOtp.classList.remove('hidden');

  currentGoogleAuthData.email = email;
  currentGoogleAuthData.name = name;

  const targetEmailEl = document.getElementById('gchooser-otp-target-email');
  if (targetEmailEl) targetEmailEl.innerText = email;

  const targetEmailTextEl = document.getElementById('gchooser-otp-target-email-text');
  if (targetEmailTextEl) targetEmailTextEl.innerText = email;

  const nameInput = document.getElementById('gchooser-otp-fullname');
  if (nameInput) nameInput.value = name || email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  const otpInput = document.getElementById('gchooser-otp-code-input');
  if (otpInput) {
    otpInput.value = '';
    otpInput.focus();
  }
  initIcons();
}

async function handleGoogleEmailSubmit() {
  const emailInput = document.getElementById('gchooser-input-email');
  const nameInput = document.getElementById('gchooser-input-name');
  const btn = document.getElementById('gchooser-btn-continue');

  const email = emailInput ? emailInput.value.trim().toLowerCase() : '';
  const name = nameInput ? nameInput.value.trim() : '';

  if (!email || !email.includes('@')) {
    showToast("Silakan masukkan alamat email yang valid!", "warning");
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i><span>Memverifikasi Email...</span>`;
    initIcons();
  }

  try {
    const res = await fetch('/api/auth/google-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Gagal memproses email");

    showGoogleOtpScreen(data.email, data.name || name);
  } catch (err) {
    showToast("Error: " + err.message, "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<span>Kirim Kode OTP & Lanjutkan</span><i data-lucide="arrow-right" class="w-4 h-4"></i>`;
      initIcons();
    }
  }
}

async function handleGoogleOtpVerify() {
  const codeInput = document.getElementById('gchooser-otp-code-input');
  const nameInput = document.getElementById('gchooser-otp-fullname');
  const schoolInput = document.getElementById('gchooser-otp-school');
  const btn = document.getElementById('gchooser-btn-verify');

  const code = codeInput ? codeInput.value.trim() : '';
  const name = nameInput ? nameInput.value.trim() : '';
  const school = schoolInput ? schoolInput.value.trim() : '';
  const targetEmailEl = document.getElementById('gchooser-otp-target-email');
  const email = (currentGoogleAuthData && currentGoogleAuthData.email) ? currentGoogleAuthData.email : (targetEmailEl ? targetEmailEl.innerText.trim() : '');

  if (!code || code.length < 6) {
    showToast("Silakan masukkan 6 digit kode OTP dengan benar!", "warning");
    return;
  }

  if (!name) {
    showToast("Silakan lengkapi nama Anda!", "warning");
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i><span>Memverifikasi...</span>`;
    initIcons();
  }

  try {
    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        code,
        name,
        school,
        action: 'register'
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Verifikasi kode OTP gagal");

    localStorage.removeItem('cendekia_session');
    currentUser = data.user;
    updateUserNavbarUI();
    closeGoogleChooserModal();
    showToast(`Selamat datang di Cendekia, ${currentUser.first_name}!`, 'success');
    showView('dashboard');
  } catch (err) {
    showToast("Verifikasi gagal: " + err.message, "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i data-lucide="check-circle" class="w-4 h-4"></i><span>Verifikasi & Masuk ke Dashboard</span>`;
      initIcons();
    }
  }
}

async function handleResendGoogleOtp() {
  if (!currentGoogleAuthData.email) return;
  try {
    const res = await fetch('/api/auth/google-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: currentGoogleAuthData.email,
        name: currentGoogleAuthData.name
      })
    });
    const data = await res.json();
    if (res.ok) {
      showToast("Kode OTP baru telah dikirimkan ke kotak masuk Gmail Anda!", "success");
    } else {
      showToast(data.detail || "Gagal mengirim ulang OTP", "error");
    }
  } catch (err) {
    showToast("Gagal mengirim ulang OTP: " + err.message, "error");
  }
}
async function handleFormLogin() {
  const emailInput = document.getElementById('login-input-email');
  const passInput = document.getElementById('login-input-password');
  const email = emailInput ? emailInput.value.trim() : '';
  const password = passInput ? passInput.value : '';

  if (!email || !email.includes('@')) {
    showToast("Silakan masukkan alamat email yang valid!", "warning");
    return;
  }

  try {
    const res = await fetch('/api/auth/login-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || "Gagal masuk ke akun");
    }
    localStorage.removeItem('cendekia_session');
    currentUser = data.user;
    updateUserNavbarUI();
    closeLoginModal();
    showToast(`Selamat datang kembali, ${currentUser.first_name || currentUser.email}!`, 'success');
    if (currentView === 'settings') populateProfileForm();
    else showView('dashboard');
  } catch (err) {
    alert(err.message);
  }
}

async function handleFormRegister() {
  const firstNameInput = document.getElementById('reg-first-name');
  const lastNameInput = document.getElementById('reg-last-name');
  const emailInput = document.getElementById('reg-email');
  const passInput = document.getElementById('reg-password');
  const schoolInput = document.getElementById('reg-school');

  const first_name = firstNameInput ? firstNameInput.value.trim() : '';
  const last_name = lastNameInput ? lastNameInput.value.trim() : '';
  const email = emailInput ? emailInput.value.trim() : '';
  const password = passInput ? passInput.value : '';
  const school = schoolInput ? schoolInput.value.trim() : '';

  if (!email || !email.includes('@')) {
    showToast("Silakan masukkan alamat email yang valid!", "warning");
    return;
  }
  if (!password || password.length < 4) {
    alert("Password wajib diisi minimal 4 karakter!");
    return;
  }

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        first_name: first_name || email.split('@')[0],
        last_name,
        school
      })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || "Pendaftaran gagal");
    }
    localStorage.removeItem('cendekia_session');
    currentUser = data.user;
    updateUserNavbarUI();
    closeLoginModal();
    showToast(`Pendaftaran berhasil! Selamat datang, ${currentUser.first_name || currentUser.email}!`, 'success');
    if (currentView === 'settings') populateProfileForm();
    else showView('dashboard');
  } catch (err) {
    alert(err.message);
  }
}

function switchSettingsTab(tabName) {
  const tabs = ['profile', 'preferences', 'integrations', 'reminders', 'subscription'];
  tabs.forEach(t => {
    const btn = document.getElementById(`stab-btn-${t}`);
    const content = document.getElementById(`stab-content-${t}`);
    if (content) {
      if (t === tabName) {
        content.classList.remove('hidden');
      } else {
        content.classList.add('hidden');
      }
    }
    if (btn) {
      if (t === tabName) {
        btn.className = "px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-slate-800 border border-slate-700 flex items-center gap-2 transition flex-shrink-0";
      } else {
        btn.className = "px-4 py-2 rounded-xl text-xs sm:text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent flex items-center gap-2 transition flex-shrink-0";
      }
    }
  });

  try {
    const url = new URL(window.location);
    url.searchParams.set('tab', tabName);
    window.history.replaceState({}, '', url);
  } catch(e) {}

  if (tabName === 'profile') {
    populateProfileForm();
  }
  initIcons();
}

function populateProfileForm() {
  if (!currentUser) return;
  const fnInput = document.getElementById('settings-first-name');
  const lnInput = document.getElementById('settings-last-name');
  const emInput = document.getElementById('settings-email');
  const scInput = document.getElementById('settings-school');
  const avatarDisplay = document.getElementById('profile-avatar-display');
  const linkedGoogleEmail = document.getElementById('linked-google-email');

  if (fnInput) fnInput.value = currentUser.first_name || '';
  if (lnInput) lnInput.value = currentUser.last_name || '';
  if (emInput) emInput.value = currentUser.email || '';
  if (scInput) scInput.value = currentUser.school || '';
  if (linkedGoogleEmail) linkedGoogleEmail.innerText = currentUser.email || '';

  if (avatarDisplay) {
    const initials = ((currentUser.first_name ? currentUser.first_name[0] : '') + (currentUser.last_name ? currentUser.last_name[0] : '')).toUpperCase() || 'HB';
    if (currentUser.avatar_url && (currentUser.avatar_url.startsWith('http') || currentUser.avatar_url.startsWith('data:'))) {
      avatarDisplay.innerHTML = `<img src="${encodeURI(currentUser.avatar_url)}" class="w-full h-full object-cover rounded-2xl" />`;
    } else {
      avatarDisplay.innerHTML = initials;
    }
  }
}

async function saveProfileSettings() {
  const fnInput = document.getElementById('settings-first-name');
  const lnInput = document.getElementById('settings-last-name');
  const scInput = document.getElementById('settings-school');

  const first_name = fnInput ? fnInput.value.trim() : '';
  const last_name = lnInput ? lnInput.value.trim() : '';
  const school = scInput ? scInput.value.trim() : '';

  try {
    const res = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        first_name,
        last_name,
        school,
        avatar_url: currentUser ? currentUser.avatar_url : null
      })
    });
    if (!res.ok) throw new Error("Gagal menyimpan profil");
    const data = await res.json();
    currentUser = data.user;
    updateUserNavbarUI();
    populateProfileForm();
    showToast("Profil berhasil diperbarui: Perubahan Anda telah disimpan.");
  } catch (err) {
    alert("Gagal menyimpan profil: " + err.message);
  }
}

function handleProfilePhotoUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async function(e) {
    const dataUrl = e.target.result;
    if (currentUser) {
      currentUser.avatar_url = dataUrl;
    }
    const avatarDisplay = document.getElementById('profile-avatar-display');
    if (avatarDisplay) {
      avatarDisplay.innerHTML = `<img src="${dataUrl}" class="w-full h-full object-cover rounded-2xl" />`;
    }
    await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        first_name: currentUser ? currentUser.first_name : '',
        last_name: currentUser ? currentUser.last_name : '',
        school: currentUser ? currentUser.school : '',
        avatar_url: dataUrl
      })
    });
    updateUserNavbarUI();
    showToast("Foto profil berhasil diperbarui!");
  };
  reader.readAsDataURL(file);
}

function resetProfileAvatar() {
  if (currentUser) {
    currentUser.avatar_url = null;
  }
  populateProfileForm();
  updateUserNavbarUI();
  saveProfileSettings();
}

function openDeleteAccountModal() {
  const m = document.getElementById('modal-delete-account');
  if (m) m.classList.remove('hidden');
  initIcons();
}

function closeDeleteAccountModal() {
  const m = document.getElementById('modal-delete-account');
  if (m) m.classList.add('hidden');
}

async function confirmDeleteAccount() {
  try {
    const res = await fetch('/api/auth/account', { method: 'DELETE' });
    if (!res.ok) throw new Error("Gagal menghapus akun");
    closeDeleteAccountModal();
    alert("Akun Anda telah berhasil dihapus. Menyetel ulang sesi...");
    window.location.href = '/';
  } catch (err) {
    alert("Gagal menghapus akun: " + err.message);
  }
}

// Initial Boot
document.addEventListener('DOMContentLoaded', async () => {
  await initAuth();

  const urlParams = new URLSearchParams(window.location.search);
  const tab = urlParams.get('tab');
  const pathname = window.location.pathname;

  if (tab || pathname.includes('settings')) {
    showView('settings');
    if (tab) switchSettingsTab(tab);
    else switchSettingsTab('profile');
  } else if (currentUser && currentUser.email) {
    showView('dashboard');
  } else {
    showView('landing');
  }
  initIcons();
});

