# Rencana Integrasi Fitur EksplorinAja

Tanggal audit: 2026-10-20  
Basis audit: branch `main` pada repository `shadowroot32/EksplorinAja`.  
Status dokumen: **Fase 0 — audit awal selesai; perbaikan keamanan chat dibuat di PR #15 dan CI berhasil. Fase lanjutan dikerjakan bertahap melalui PR terpisah.**

## 1. Ringkasan eksekutif

EksplorinAja sudah memiliki fondasi produk belajar yang berjalan dan harus dikembangkan secara bertahap, bukan diganti framework-nya. Stack yang teridentifikasi: Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, PostgreSQL + Drizzle ORM, Vercel AI SDK dengan provider kompatibel OpenAI, dan autentikasi Google OAuth/session JWT dalam cookie HTTP-only.

Fitur yang sudah ada menurut README, skema, dan kode yang diperiksa:
- Login Google OAuth, profil, session, penghapusan akun, dan ekspor data.
- Subjek dan materi belajar dari teks, PDF, dan YouTube.
- Ringkasan, flashcard, kuis, SM-2/review, progres/streak, Cornell Notes, mind map, skrip podcast/TTS browser, chat materi, serta tautan berbagi baca-saja.
- Preferensi Bahasa Indonesia/Inggris dan tema light/dark; pengurangan animasi mengikuti `prefers-reduced-motion`.
- CI GitHub Actions untuk test, type-check, build, dan HTTP smoke tests.

Fokus integrasi adalah memperluas produk yang ada. Tidak ada alasan saat ini untuk mengganti framework, ORM, provider AI, atau memigrasikan database ke teknologi baru secara menyeluruh.

## 2. Audit repository

### Stack dan konfigurasi

| Area | Kondisi teramati | Implikasi |
|---|---|---|
| Framework/UI | Next.js App Router, React, TypeScript, Tailwind v4 | Pertahankan stack dan pola komponen yang ada. |
| Database | PostgreSQL, Drizzle ORM; skema di `src/lib/db/schema.ts` | Perubahan data perlu skema Drizzle dan migrasi SQL yang dapat ditinjau/di-rollback. |
| AI | `src/lib/ai/engine.ts`, Vercel AI SDK + `@ai-sdk/openai`; `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL` | Sudah memiliki konfigurasi provider berbasis environment. Perlu abstraksi kecil/kontrak yang konsisten jika menambah provider atau pipeline. |
| Auth | `src/lib/auth.ts`, Google OAuth, JWT HS256, cookie HTTP-only, Secure saat production, SameSite=Lax | Pertahankan kompatibilitas cookie dan callback; uji regresi OAuth pada perubahan auth. |
| Preferensi | `src/components/providers/PreferencesProvider.tsx` | Locale `id/en` dan tema `light/dark` sudah ada; mode `system` belum terwakili pada tipe yang diperiksa. |
| CI | `.github/workflows/ci.yml`: `npm test`, `npm run typecheck`, `npm run build`, smoke tests | Jadikan seluruh pemeriksaan ini gate setiap fase yang mengubah kode. |
| Deployment | `DEPLOYMENT_CHECKLIST.md`, `scripts/deploy-selfhosted.ps1`, `deploy/cloudflare-production.env.example` | Tersedia panduan self-hosted Windows + Cloudflare Tunnel, tetapi file repo bukan bukti konfigurasi server/tunnel production saat ini. |

### Rute/area yang sudah teridentifikasi

- Publik: `/`, metadata SEO, `robots.txt`, sitemap, manifest.
- Auth: `/login`, endpoint Google OAuth callback, endpoint OTP legacy.
- Dashboard: `/dashboard`, `/subjects`, `/library`, `/study`, `/review`, `/settings`.
- API utama: `/api/study-sets`, `/api/study-sets/:id/chat`, `/api/dashboard`, `/api/user`, `/api/user/export`, endpoint auth.
- Pembagian materi: halaman share baca-saja dan API share.

Daftar di atas adalah peta awal berdasarkan README, proxy, dan berkas yang berhasil diperiksa; sebelum implementasi setiap fase, petakan rute aktual terkait secara lebih lengkap agar tidak mengasumsikan endpoint yang belum ada.

### Data model yang teramati

Tabel utama dalam `src/lib/db/schema.ts`: `users`, `otp_codes`, `user_sessions`, `rate_limits`, `subjects`, `study_sets`, `flashcards`, `quiz_items`, `chat_messages`, `study_logs`, `activities`, `podcasts`, `cornell_notes`, dan `study_set_shares`.

Model saat ini berpusat pada `study_sets`; belum terlihat model folder, bab/chapter, embedding/vector, task queue, quiz attempt/progress parsial, flashcard lapse, atau artefak studio generik. `flashcards` sudah menyimpan interval, ease factor, due date, dan repetitions; perlu audit apakah implementasi review menyimpan semua nilai SM-2 yang dibutuhkan (termasuk lapses) sebelum mengubah skema.

### Temuan awal dan risiko teknis

1. Endpoint chat yang diperiksa adalah `src/app/api/study-sets/[id]/chat/route.ts`. Ia melakukan request AI sinkron tanpa SSE, menyimpan pesan user sebelum AI sukses, dan handler GET mengambil pesan berdasarkan `studySetId` tanpa memfilter `userId`. POST memeriksa kepemilikan study set, tetapi GET perlu diperbaiki sebelum memperluas riwayat chat. Tambahkan tes akses lintas pengguna.
2. Endpoint pembuatan materi melakukan ekstraksi dan generasi AI dalam satu request dengan `maxDuration = 90`; PDF dibatasi 4 MB dan teks 60.000 karakter. Pipeline background task belum teridentifikasi. Pindahkan proses berat ke job queue secara bertahap dan pertahankan batas teknis upload yang dapat dikonfigurasi, bukan kuota per pengguna.
3. Chat yang ada memakai ringkasan/awal isi materi sebagai konteks, bukan RAG berindeks bab dengan span sitasi. Tidak ada bukti pgvector pada skema yang diperiksa. RAG memerlukan desain chunk, metadata sumber, retrieval, dan verifikasi sitasi terlebih dahulu.
4. Prompt AI perlu memperlakukan materi impor sebagai data tidak tepercaya. Endpoint URL di masa depan memerlukan perlindungan SSRF; artefak HTML harus diisolasi dengan sandbox.
5. Rate limiter disebut README sebagai in-memory. Untuk beberapa instance, rate limit autentikasi perlu storage bersama; jangan menerapkan limit berbasis kuota pada fitur belajar.
6. Cookie production bergantung pada `NODE_ENV` dan environment secret. Cloudflare Tunnel dapat memengaruhi forwarded headers, HTTPS, OAuth callback, dan koneksi SSE. Uji pada lingkungan yang menyerupai production.
7. `DEPLOYMENT_CHECKLIST.md` menyebut domain custom belum diaktifkan dan Quick Tunnel bersifat sementara. Audit ini tidak memiliki akses yang membuktikan status mesin host, Named Tunnel, DNS, database production, atau secret runtime. **Tidak ada konfigurasi production yang diubah.**
8. `README.md` masih memuat badge/URL CI yang mengarah ke repository lama `shadowroot32/cendekia-ai`; rapikan pada fase dokumentasi/SEO setelah memverifikasi workflow URL kanonis.
9. Belum ditemukan kode billing/Stripe/subscription dari pencarian awal repository; pencarian kode GitHub dapat tidak lengkap bila indeks tidak tersedia. Lakukan scan repo penuh untuk istilah billing/plan/quota/usage/paywall sebelum menghapus atau menyimpulkan tidak ada referensi tersisa.

## 3. Audit billing, paywall, dan kuota

### Keputusan produk (dikonfirmasi pemilik)
- EksplorinAja **sepenuhnya gratis**. Tidak ada paket berbayar, langganan, checkout, paywall, atau fitur premium.
- Tidak ada kuota penggunaan per pengguna untuk pesan AI, flashcard, kuis, atau artefak belajar.
- Batas teknis yang wajar tetap diperbolehkan untuk keamanan dan stabilitas (ukuran request/unggahan, timeout, concurrency, proteksi spam/bot, dan retry). Batas teknis tidak boleh digunakan sebagai kuota berbayar terselubung.
- Settings tidak memerlukan tab billing; copy dan UI harus menjelaskan akses gratis tanpa mengisyaratkan paket Pro.

### Hasil pemeriksaan statis sementara
- `package.json` yang diperiksa tidak mencantumkan dependency Stripe atau library billing.
- Skema Drizzle yang diperiksa tidak menunjukkan tabel plan/subscription/payment/quota.
- Pencarian kode GitHub untuk `subscription`, `quota`, `pricing`, dan `limit` tidak menghasilkan hasil. Karena pencarian kode/index dapat tidak lengkap, ini **belum** membuktikan tidak ada referensi di seluruh repo.
- Status saat ini: **belum ditemukan bukti billing/kuota pengguna pada area yang diperiksa; audit seluruh file, route, UI, dan migrasi masih harus diselesaikan**.

### Daftar yang wajib diaudit sebelum penghapusan
- Rute/halaman/komponen bernama pricing, checkout, billing, subscription, manage plan.
- Modal paywall dan trigger fitur belajar/artefak, ikon mahkota, badge Free/Pro, serta copy promosi paket.
- Endpoint server yang menolak request karena kuota, jumlah pesan, pemakaian per bulan, atau saldo token.
- Tabel/migrasi/model plan, subscription, quota, usage counter, payment.
- Invalidasi cache subscription dan pesan reset kuota.
- Integrasi Stripe/Apple/Google Play Billing atau webhook terkait.

Kebijakan target: gratis tanpa billing dan tanpa batas jumlah pesan/artefak per pengguna. Batas ukuran input, timeout, antrean, concurrency, proteksi bot, dan retry server adalah kontrol stabilitas/keamanan, bukan paywall atau kuota pengguna.

## 4. Rencana implementasi bertahap

Estimasi adalah perkiraan engineering awal, bukan janji durasi; tiap fase ditutup dengan test, self-review, ringkasan, dan PR terpisah. Fase berikutnya dilanjutkan setelah hasil fase ditinjau.

| Fase | Cakupan | Estimasi | Prioritas |
|---|---|---:|---|
| 0 | Audit, daftar risiko, dokumen rencana (dokumen ini) | Selesai | P0 |
| 1 | Design tokens, light/dark/system, landing orisinal, reduced motion, SEO/aksesibilitas | 2–4 hari | P1 |
| 2 | Audit dan penyempurnaan auth/onboarding, locale id/en, cookie dan error states | 2–4 hari | P1 |
| 3 | Perluasan hirarki Subject → Folder → Source/Chapter, dashboard search/progress | 4–7 hari | P1 |
| 4 | Import wizard, parser tambahan, metadata span, job status/background queue | 5–10 hari | P1 |
| 5 | Reader, TOC, pencarian dokumen, edit Markdown, seleksi teks | 3–6 hari | P2 |
| 6 | Chat sessions, ownership fixes, SSE heartbeat, buffering, chapter filter, sitasi, retry, voice input | 5–9 hari | P1 |
| 7 | SM-2 lengkap, lapse tracking, import/export CSV Anki, tes algoritme | 2–4 hari | P1 |
| 8 | Kuis dengan attempt/progres parsial, penjelasan dan referensi sumber, tryout | 3–6 hari | P2 |
| 9 | Mind map dapat diedit, node-source mapping, sync status | 3–6 hari | P2 |
| 10 | Studio artefak async: report dan data table dahulu; kemudian slide deck, infographic, audio/video | 6–15+ hari | P1/P2 |
| 11 | Media study/transkrip bertimestamp dan catatan | 3–6 hari | P2 |
| 12 | Readiness, streak/heatmap, global search, notification center, sharing lanjutan | 4–8 hari | P2 |
| 13 | Keamanan/deployment: SSE melalui tunnel, health check, SSRF/CSP, upload, backup/logging | 3–7 hari | P1 |
| 14 | Settings: profil, akun, notifikasi, keamanan, integrasi; tanpa tab billing | 3–6 hari | P2 |
| 15 | REST API/OpenAPI dan MCP server dengan token/OAuth, audit keamanan | 5–10+ hari | P3 |

### Urutan rekomendasi

1. Bereskan baseline test dan keamanan data yang sudah ada, terutama akses GET chat lintas pengguna. PR #15 (`fix/chat-history-authorization`) sudah dibuat; GitHub Actions CI pada commit `f183186c2fc24c5e105c794c53e4982ea35353ec` berstatus success untuk test, type-check, build, dan smoke tests. PR belum digabung.
2. Bangun fondasi import/background jobs dan metadata sumber agar fitur lanjutan tidak mengulang arsitektur.
3. Chat sessions + SSE + RAG/sitasi.
4. Flashcard SM-2 dan kuis dengan tes.
5. Mind map dan Studio; mulai dari report/data table yang dapat diekspor sebelum generasi audio/video yang berat.
6. Design system/landing dan pengalaman reader dapat berjalan sebagai fase UI yang terisolasi, tanpa mengganti framework.
7. Engagement, integrations, dan MCP setelah kontrak data/API stabil.

## 5. Standar implementasi dan quality gates

- Jangan mengganti Next.js, PostgreSQL, Drizzle, atau provider AI yang sudah dikonfigurasi tanpa alasan terukur.
- Gunakan `.env.example` untuk dokumentasi variabel baru; jangan pernah menambahkan secret.
- Setiap perubahan skema disertai migrasi SQL eksplisit, langkah rollback, dan instruksi backup; jangan menjalankan migrasi otomatis pada production.
- Tambahkan unit test untuk SM-2, parser/validator, ownership/auth, retrieval filtering, dan format sitasi.
- Jalankan `npm ci`, `npm test`, `npm run typecheck`, `npm run build`, serta smoke/E2E yang relevan.
- Untuk UI, cek mobile/desktop, keyboard, kontras, reduced motion, dan light/dark/system.
- Untuk proses AI berat, status job harus persisten (`pending → processing → completed/failed`), dengan timeout, concurrency control, retry yang aman, dan status yang tetap ada setelah refresh.
- Semua pesan UI default Bahasa Indonesia; teks baru masuk ke sistem locale id/en.
- Tidak mengubah server produksi, database production, DNS, Cloudflare Tunnel, OAuth Console, atau secret tanpa instruksi eksplisit dan prosedur rilis yang disepakati.

## 6. Batas audit Fase 0

Audit dilakukan melalui file dan metadata repository GitHub yang tersedia. Belum dilakukan checkout dan eksekusi lokal, build/test aktual, scan menyeluruh terhadap semua file, inspeksi mesin hosting/tunnel, koneksi database production, atau verifikasi visual live. Karena itu, hasil ini adalah baseline audit statis; tiap fase harus memvalidasi asumsi yang relevan sebelum mengubah kode.

## 7. Gerbang persetujuan dan aturan eksekusi

Pemilik telah menyetujui pelaksanaan seluruh fase secara bertahap, dengan prioritas awal keamanan, audit billing/kuota, dan fondasi. Setiap fase harus memiliki perubahan yang terukur, tes yang relevan, self-review, dan PR terpisah. Jangan menggabungkan PR atau melakukan deployment/perubahan production tanpa izin eksplisit. Status CI harus dilaporkan apa adanya; jangan mengklaim tes lokal bila tidak dijalankan.
