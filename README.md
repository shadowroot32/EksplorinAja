# EksplorinAja

[![CI](https://github.com/shadowroot32/cendekia-ai/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/shadowroot32/cendekia-ai/actions/workflows/ci.yml)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql)](https://www.postgresql.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**EksplorinAja** adalah ruang belajar berbasis AI yang membantu mengubah catatan, dokumen PDF, dan materi YouTube menjadi ringkasan, flashcard, kuis, serta pengalaman belajar yang terorganisasi. Aplikasi menggunakan Next.js App Router, TypeScript, Drizzle ORM, dan PostgreSQL.

## Fitur

### Belajar dan progres
- Materi belajar dari teks/catatan, PDF, dan tautan YouTube.
- Workspace belajar terpadu dengan tab Document, Summaries, Notes, Flashcards berbentuk grid, Mind Map, dan Artifacts.
- Tampilan dokumen menggunakan deteksi heading konservatif agar fragmen OCR tidak memenuhi daftar isi; paragraf hasil ekstraksi dirapikan, baris daftar dipertahankan, serta focus mode memakai toolbar ringkas dan area baca dengan scroll utama.
- OCR fallback untuk PDF scan: ekstraksi teks biasa dicoba terlebih dahulu, lalu Tesseract.js mengenali teks pada maksimal 8 halaman pertama dengan render resolusi lebih tinggi jika hasil ekstraksi terlalu sedikit.
- Ringkasan AI, flashcard, kuis pilihan ganda, dan chat/tutor berbasis materi.
- Spaced repetition berbasis algoritma SuperMemo SM-2.
- Progres belajar, review yang jatuh tempo, streak/tujuan, dan statistik dashboard.

### Catatan dan berbagi
- Cornell Notes tersimpan per materi.
- Mind map hierarkis yang dibuat saat diminta dari materi sumber.
- Naskah podcast tersimpan dan dapat dibacakan menggunakan text-to-speech bawaan browser.
- Tautan berbagi baca-saja yang berlaku 1, 7, atau 30 hari dan dapat dicabut.
- Ekspor data pribadi dalam file JSON, termasuk profil, materi, hasil belajar, catatan, naskah, chat, progres, dan metadata tautan berbagi.

### Akun dan keamanan
- Login Google OAuth 2.0 / OpenID Connect dengan state, nonce, PKCE S256, dan verifikasi ID token.
- Session cookie HTTP-only dan pengaturan profil.
- Penghapusan akun dan data terkait.
- Rahasia provider AI, OAuth, database, dan session diambil dari environment variables.

## Teknologi

| Bagian | Teknologi |
| --- | --- |
| Framework | Next.js App Router |
| Bahasa/UI | TypeScript, React, Tailwind CSS v4 |
| Database | PostgreSQL, Drizzle ORM |
| Login | Google OAuth 2.0 / OpenID Connect |
| Session | JWT menggunakan `jose`, cookie HTTP-only |
| AI | Vercel AI SDK dan endpoint kompatibel OpenAI |
| Pemeriksaan | Node.js Test Runner, TypeScript, production build, HTTP smoke tests |

## Persyaratan

- Node.js 22 dan npm.
- PostgreSQL yang dapat diakses aplikasi.
- Endpoint LLM yang kompatibel dengan OpenAI dan API key.
- Google Cloud OAuth 2.0 Web Client.

## Menjalankan secara lokal

```bash
git clone https://github.com/shadowroot32/cendekia-ai.git
cd cendekia-ai
npm ci
cp .env.example .env
```

Isi variabel di `.env`, pastikan PostgreSQL tersedia, lalu sinkronkan skema database:

```bash
npx drizzle-kit push
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

**Sebelum menjalankan `drizzle-kit push` pada database yang berisi data penting, buat backup dan tinjau perubahan skema.** Untuk fitur tahap 3 yang ditambahkan ke database lama, SQL manual tersedia di [`drizzle/0001_stage3_learning_features.sql`](drizzle/0001_stage3_learning_features.sql). Jangan menjalankan SQL manual itu sebagai pengganti sinkronisasi skema lengkap pada database yang benar-benar kosong.

## Domain resmi

Domain kanonis yang dipilih adalah [`https://eksplorinaja.com`](https://eksplorinaja.com). Konfigurasi aplikasi menggunakan `NEXT_PUBLIC_APP_URL` untuk canonical metadata, Open Graph, `robots.txt`, sitemap, dan fallback Google OAuth. Nilai `.env.example` tetap untuk localhost agar development lokal tidak rusak; isi production adalah `NEXT_PUBLIC_APP_URL=https://eksplorinaja.com` dan `GOOGLE_REDIRECT_URI=https://eksplorinaja.com/api/auth/google/callback`.

Sebelum domain aktif, domain harus terdaftar pada akun yang kamu kontrol, DNS atau Cloudflare Tunnel/Pages harus diarahkan ke aplikasi, dan Google OAuth Client harus mendapat origin serta callback HTTPS yang persis sama. URL `trycloudflare.com` adalah Quick Tunnel sementara, bukan hostname production tetap. Detail langkah ada di [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md#domain-custom-eksplorinajacom-belum-diaktifkan). Penambahan konfigurasi repository ini tidak mendaftarkan domain, mengubah DNS, atau melakukan deployment.

## Menyiapkan Google OAuth

1. Buka [Google Cloud Console](https://console.cloud.google.com/) dan pilih/buat project.
2. Konfigurasikan Google Auth Platform / OAuth consent screen.
3. Buat OAuth Client ID bertipe **Web application**.
4. Tambahkan origin aplikasi pada **Authorized JavaScript origins**, misalnya `http://localhost:3000`.
5. Tambahkan URI callback ke **Authorized redirect URIs**: `http://localhost:3000/api/auth/google/callback`.
6. Isi `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, dan `NEXT_PUBLIC_APP_URL` pada environment.
7. Untuk production, daftarkan callback HTTPS dengan domain yang benar-benar dipakai dan redeploy aplikasi.

Flow login menggunakan authorization code, PKCE S256, state, nonce, verifikasi ID token melalui Google JWKS, pemeriksaan issuer/audience, dan klaim email terverifikasi. Password Google tidak pernah diterima atau disimpan oleh EksplorinAja.

## Environment variables

| Variabel | Kegunaan |
| --- | --- |
| `DATABASE_URL` | Connection string PostgreSQL |
| `LLM_BASE_URL` | Base URL provider LLM kompatibel OpenAI |
| `LLM_API_KEY` | API key provider LLM |
| `LLM_MODEL` | Nama model provider |
| `GOOGLE_CLIENT_ID` | Client ID OAuth Web Google |
| `GOOGLE_CLIENT_SECRET` | Client Secret OAuth; rahasiakan |
| `GOOGLE_REDIRECT_URI` | Callback OAuth lengkap yang terdaftar di Google Cloud |
| `NEXT_PUBLIC_APP_URL` | URL publik aplikasi; sumber canonical URL, robots/sitemap dan fallback callback; gunakan domain production yang resmi |
| `JWT_SECRET` | Secret acak minimal 32 karakter di production |
| `PDF_OCR_LANGS` | Opsional; bahasa OCR Tesseract (default `eng+ind`) |

SMTP tidak diperlukan untuk login utama Google. Endpoint email OTP lama masih tersedia sebagai kompatibilitas API; SMTP hanya dibutuhkan bila endpoint tersebut sengaja digunakan.

## Pengujian dan CI

Jalankan sebelum merilis perubahan:

```bash
npm ci
npm test
npm run typecheck
npm run build
npm run start
```

GitHub Actions juga menjalankan smoke tests terhadap server production untuk pemeriksaan autentikasi API material, progres belajar, fitur belajar, dan respons endpoint OTP legacy. Workflow berjalan pada push ke `main` dan pull request: [riwayat CI](https://github.com/shadowroot32/cendekia-ai/actions/workflows/ci.yml).

CI **tidak** membuktikan bahwa Google OAuth, kredensial provider AI, database production, atau konfigurasi hosting sungguhan sudah benar. Lihat [checklist deployment](DEPLOYMENT_CHECKLIST.md) untuk langkah sebelum rilis.

## Struktur repository

```text
.
├── .github/workflows/ci.yml
├── drizzle/
│   └── 0001_stage3_learning_features.sql
├── scripts/                       # HTTP smoke tests
├── src/
│   ├── proxy.ts                 # Guard rute dashboard (Next.js 16)
│   ├── app/
│   │   ├── (auth)/login/          # Login
│   │   ├── (dashboard)/           # Dashboard, library, study, settings
│   │   ├── api/auth/google/       # OAuth start dan callback
│   │   ├── api/study-sets/        # Materi, review, dan fitur belajar
│   │   ├── api/user/              # Profil, penghapusan akun, ekspor data
│   │   └── share/                 # Halaman berbagi baca-saja
│   ├── components/
│   │   ├── layout/
│   │   └── study/                 # Flashcard, quiz, Cornell, mind map, podcast
│   └── lib/
│       ├── ai/                    # Integrasi provider LLM dan validasi output
│       ├── db/                    # Drizzle client dan skema
│       └── auth.ts                # Session
├── tests/                         # Unit tests
├── .env.example
├── CHANGELOG.md
├── CONTRIBUTING.md
├── DEPLOYMENT_CHECKLIST.md
├── SECURITY.md
└── README.md
```

## Keamanan dan deployment

- Atur secrets menggunakan environment variables/secret manager. Jangan commit `.env`, API key, OAuth secret, atau `JWT_SECRET`.
- Production wajib menggunakan HTTPS, callback OAuth yang tepat, dan `JWT_SECRET` acak minimal 32 karakter.
- Tautan berbagi dapat dibuka oleh siapa pun yang memilikinya hingga kedaluwarsa atau dicabut. Jangan membagikan materi rahasia.
- Rate limiter saat ini berbasis memori; deployment multi-instance membutuhkan rate limiter bersama, misalnya Redis.
- Text-to-speech podcast masih menggunakan kemampuan browser dan **belum** menghasilkan file MP3 yang di-host.
- Ekspor JSON berisi data belajar pribadi. Simpan file hasil unduhan secara aman dan hapus jika tidak lagi diperlukan.

Baca [SECURITY.md](SECURITY.md) untuk panduan pelaporan dan [CONTRIBUTING.md](CONTRIBUTING.md) untuk alur kontribusi.

## Lisensi

Project ini dirilis di bawah [MIT License](LICENSE).
