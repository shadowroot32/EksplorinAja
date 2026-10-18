# Cendekia.ai

[![CI](https://github.com/shadowroot32/cendekia-ai/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/shadowroot32/cendekia-ai/actions/workflows/ci.yml)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql)](https://www.postgresql.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**Cendekia.ai** adalah ruang belajar berbasis AI yang mengubah catatan, PDF, dan materi YouTube menjadi ringkasan, flashcard, kuis, serta pengalaman belajar yang terorganisasi. Dibangun dengan Next.js App Router, TypeScript, Drizzle ORM, dan PostgreSQL.

## Daftar isi

- [Fitur](#fitur)
- [Teknologi](#teknologi)
- [Persyaratan](#persyaratan)
- [Menjalankan secara lokal](#menjalankan-secara-lokal)
- [Menyiapkan Google OAuth](#menyiapkan-google-oauth)
- [Environment variables](#environment-variables)
- [Pengujian dan CI](#pengujian-dan-ci)
- [Struktur repository](#struktur-repository)
- [Keamanan dan deployment](#keamanan-dan-deployment)
- [Kontribusi](#kontribusi)
- [Lisensi](#lisensi)

## Fitur

- **Google Sign-In:** login satu klik melalui OAuth 2.0 / OpenID Connect; password Google tidak pernah diterima atau disimpan Cendekia.ai.
- **Materi multi-sumber:** catatan, dokumen PDF, dan tautan YouTube.
- **Belajar dengan AI:** ringkasan materi, flashcard, kuis pilihan ganda, dan tutor berbasis konteks materi.
- **Spaced repetition:** jadwal review menggunakan algoritma SuperMemo SM-2.
- **Dashboard responsif:** statistik progres dan navigasi untuk desktop maupun perangkat seluler.
- **Self-hosted:** database dan provider LLM dikonfigurasi di environment pemilik deployment.

## Teknologi

| Bagian | Teknologi |
| --- | --- |
| Framework | Next.js App Router |
| Bahasa | TypeScript |
| UI | React, Tailwind CSS v4 |
| Database | PostgreSQL, Drizzle ORM |
| Login | Google OAuth 2.0 / OpenID Connect |
| Session | JWT menggunakan `jose`, cookie HTTP-only |
| AI | Vercel AI SDK, endpoint kompatibel OpenAI |
| Pengujian | Node.js Test Runner, TypeScript, production build, HTTP smoke test |

## Persyaratan

- Node.js 22 dan npm (versi yang dipakai CI).
- PostgreSQL yang dapat diakses aplikasi.
- Endpoint LLM yang kompatibel dengan OpenAI.
- Google Cloud OAuth 2.0 Web Client untuk login.

## Menjalankan secara lokal

```bash
git clone https://github.com/shadowroot32/cendekia-ai.git
cd cendekia-ai
npm ci
cp .env.example .env
```

Isi environment variables pada file `.env`, siapkan database pengembangan, lalu jalankan:

```bash
npx drizzle-kit push
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

## Menyiapkan Google OAuth

1. Buka [Google Cloud Console](https://console.cloud.google.com/).
2. Pilih atau buat project, lalu konfigurasi Google Auth Platform / OAuth consent screen.
3. Buat OAuth Client ID bertipe **Web application**.
4. Tambahkan origin aplikasi pada **Authorized JavaScript origins** (contoh lokal: `http://localhost:3000`).
5. Tambahkan URI berikut ke **Authorized redirect URIs**:
   `http://localhost:3000/api/auth/google/callback`
6. Salin Client ID dan Client Secret ke environment. Untuk production, gunakan domain HTTPS milikmu dan daftarkan callback HTTPS yang sama persis.
7. Restart atau redeploy aplikasi setelah mengubah environment variables.

Flow menggunakan authorization code, PKCE S256, state, nonce, verifikasi ID token menggunakan Google JWKS, pemeriksaan issuer/audience, dan klaim email terverifikasi. Akun dipetakan berdasarkan email yang dinormalisasi, lalu Cendekia.ai menerbitkan session cookie sendiri.

## Environment variables

| Variabel | Kegunaan |
| --- | --- |
| `DATABASE_URL` | Connection string PostgreSQL |
| `LLM_BASE_URL` | Base URL provider LLM kompatibel OpenAI |
| `LLM_API_KEY` | API key provider LLM |
| `LLM_MODEL` | Nama model provider |
| `GOOGLE_CLIENT_ID` | Client ID OAuth aplikasi Web Google |
| `GOOGLE_CLIENT_SECRET` | Client Secret OAuth; simpan hanya di environment/secret manager |
| `GOOGLE_REDIRECT_URI` | Callback OAuth lengkap dan harus cocok dengan Google Cloud Console |
| `NEXT_PUBLIC_APP_URL` | Base URL aplikasi; digunakan untuk callback jika `GOOGLE_REDIRECT_URI` tidak diisi |
| `JWT_SECRET` | Secret acak, minimal 32 karakter di production |

**Login Google memerlukan Client ID, Client Secret, dan URL callback yang sesuai.** Jika belum dikonfigurasi, halaman login menampilkan pesan error dan tidak mengaku berhasil. Jangan commit file `.env`, client secret, atau JWT secret ke Git.

SMTP tidak diperlukan untuk tombol login utama. Endpoint email OTP lama tetap ada sebagai kompatibilitas API, tetapi UI login tidak menggunakannya. Konfigurasi SMTP hanya dibutuhkan bila endpoint legacy itu sengaja dipakai.

## Pengujian dan CI

Jalankan pemeriksaan berikut sebelum mengirim perubahan:

```bash
npm ci
npm test
npm run typecheck
npm run build
npm start
```

Unit test mencakup helper OTP lama serta helper OAuth (token acak, PKCE S256, perbandingan state, normalisasi email, dan aturan callback). Smoke test CI menjalankan production server dan memeriksa halaman serta respons API; ia tidak memakai akun Google sungguhan atau membuktikan konfigurasi OAuth deployment.

Workflow [GitHub Actions](.github/workflows/ci.yml) berjalan saat push ke `main` dan pull request. [Lihat riwayat CI](https://github.com/shadowroot32/cendekia-ai/actions/workflows/ci.yml).

## Struktur repository

```text
.
├── .github/
│   ├── pull_request_template.md
│   └── workflows/ci.yml
├── scripts/
│   └── smoke-otp-api.cjs
├── src/
│   ├── app/
│   │   ├── (auth)/login/                 # Halaman login Google
│   │   ├── (dashboard)/                 # Dashboard, subjects, library, study, settings
│   │   └── api/auth/google/              # OAuth start dan callback
│   ├── components/
│   │   ├── auth/LoginForm.tsx
│   │   └── layout/Navbar.tsx
│   └── lib/
│       ├── ai/                           # Integrasi LLM
│       ├── db/                           # Drizzle client dan skema PostgreSQL
│       ├── auth.ts                       # Session JWT
│       ├── google-oauth-utils.ts          # PKCE, state comparison, redirect URI
│       ├── email.ts                       # SMTP endpoint OTP legacy
│       └── rate-limit.ts
├── tests/
│   └── otp.test.cjs
├── .env.example
├── CONTRIBUTING.md
├── LICENSE
├── README.md
└── SECURITY.md
```

## Keamanan dan deployment

- Gunakan Google OAuth Client Secret dan JWT secret dari secret manager/environment variables; jangan simpan di repository.
- Di production, callback wajib HTTPS dan URL-nya harus sama persis dengan yang terdaftar di Google Cloud.
- Gunakan `JWT_SECRET` acak minimal 32 karakter; jangan gunakan nilai contoh.
- Jangan log authorization code, ID token, OAuth secret, token sesi, API key, password, atau cookie sesi.
- Rate limiter saat ini berbasis memori; deployment multi-instance memerlukan rate limiter bersama (misalnya Redis).
- CI tidak memakai kredensial Google sungguhan. Uji login sungguhan hanya pada environment dan akun yang kamu kendalikan.

## Kontribusi

Baca [CONTRIBUTING.md](CONTRIBUTING.md) sebelum membuka pull request. Sertakan hasil test, type-check, build, dan catatan konfigurasi jika diperlukan.

## Lisensi

Project ini dirilis di bawah [MIT License](LICENSE).
