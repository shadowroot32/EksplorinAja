# Cendekia.ai

[![CI](https://github.com/shadowroot32/cendekia-ai/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/shadowroot32/cendekia-ai/actions/workflows/ci.yml)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql)](https://www.postgresql.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**Cendekia.ai** adalah ruang belajar berbasis AI untuk mengubah catatan, dokumen PDF, dan materi YouTube menjadi ringkasan, flashcard, kuis, serta pengalaman belajar yang terorganisasi. Project ini dibangun dengan Next.js App Router, TypeScript, Drizzle ORM, dan PostgreSQL.

## Daftar isi

- [Fitur](#fitur)
- [Teknologi](#teknologi)
- [Persyaratan](#persyaratan)
- [Menjalankan secara lokal](#menjalankan-secara-lokal)
- [Konfigurasi environment](#konfigurasi-environment)
- [Pengujian dan build](#pengujian-dan-build)
- [Continuous integration](#continuous-integration)
- [Struktur repository](#struktur-repository)
- [Catatan keamanan dan deployment](#catatan-keamanan-dan-deployment)
- [Kontribusi](#kontribusi)
- [Lisensi](#lisensi)

## Fitur

- **Materi multi-sumber:** catatan, dokumen PDF, dan tautan YouTube.
- **Belajar dengan AI:** ringkasan materi, flashcard, kuis pilihan ganda, dan tutor berbasis konteks materi.
- **Spaced repetition:** penjadwalan review menggunakan algoritma SuperMemo SM-2.
- **Login tanpa password:** OTP email enam digit dengan masa berlaku, hashing OTP saat disimpan, batas percobaan, dan session cookie HTTP-only.
- **Dashboard responsif:** ringkasan progres dan navigasi yang disesuaikan untuk desktop maupun perangkat seluler.
- **Self-hosted:** konfigurasi database, penyedia email, dan LLM berada di environment milik pengguna.

## Teknologi

| Bagian | Teknologi |
| --- | --- |
| Framework | Next.js App Router |
| Bahasa | TypeScript |
| UI | React, Tailwind CSS v4 |
| Database | PostgreSQL |
| ORM | Drizzle ORM |
| Autentikasi | JWT menggunakan `jose`, email OTP menggunakan Nodemailer |
| AI | Vercel AI SDK dengan endpoint yang kompatibel dengan OpenAI |
| Pengujian | Node.js Test Runner, TypeScript, production build, HTTP smoke test |

## Persyaratan

- Node.js 22 direkomendasikan (versi yang dipakai CI).
- npm.
- PostgreSQL yang dapat diakses aplikasi.
- Endpoint LLM yang kompatibel dengan OpenAI.
- Kredensial SMTP aktif untuk menguji login OTP lewat email.

## Menjalankan secara lokal

1. **Clone repository dan masuk ke folder project.**

   ```bash
   git clone https://github.com/shadowroot32/cendekia-ai.git
   cd cendekia-ai
   ```

2. **Pasang dependensi.**

   ```bash
   npm ci
   ```

3. **Siapkan environment.**

   ```bash
   cp .env.example .env
   ```

   Buka `.env` dan isi nilai yang sesuai dengan lingkunganmu. Rincian variabel tersedia pada bagian [Konfigurasi environment](#konfigurasi-environment).

4. **Siapkan skema database.**

   Untuk pengembangan lokal, jalankan:

   ```bash
   npx drizzle-kit push
   ```

   Pastikan `DATABASE_URL` mengarah ke database pengembangan yang benar sebelum menjalankan perintah ini.

5. **Jalankan aplikasi.**

   ```bash
   npm run dev
   ```

   Buka [http://localhost:3000](http://localhost:3000).

## Konfigurasi environment

Salin `.env.example` menjadi `.env`, lalu konfigurasi variabel berikut.

| Variabel | Kegunaan |
| --- | --- |
| `DATABASE_URL` | Connection string PostgreSQL |
| `LLM_BASE_URL` | Base URL provider LLM yang kompatibel dengan OpenAI |
| `LLM_API_KEY` | API key provider LLM; gunakan nilai sesuai provider |
| `LLM_MODEL` | Nama model yang tersedia pada provider |
| `SMTP_HOST` | Host SMTP untuk email OTP |
| `SMTP_PORT` | Port SMTP; umum digunakan 587 untuk STARTTLS atau 465 untuk TLS |
| `SMTP_USER` | Username SMTP / alamat email pengirim |
| `SMTP_PASSWORD` | Password SMTP atau app password dari provider |
| `SMTP_FROM` | Alamat pengirim yang ditampilkan; opsional |
| `JWT_SECRET` | Secret untuk sesi JWT dan hash OTP; di production minimal 32 karakter |
| `NEXT_PUBLIC_APP_URL` | URL aplikasi untuk konfigurasi aplikasi |

### Gmail dan OTP

Untuk memakai Gmail, aktifkan 2-Step Verification pada akun Google dan buat **Google App Password**. Gunakan app password tersebut sebagai `SMTP_PASSWORD`; jangan gunakan password akun Google biasa. Untuk provider lain, gunakan hostname, port, username, dan password SMTP yang diberikan provider.

Alur OTP dirancang agar tidak menyatakan berhasil bila SMTP tidak dikonfigurasi atau pengiriman gagal:

- Konfigurasi SMTP yang hilang menghasilkan HTTP 503.
- Kegagalan pengiriman menghasilkan HTTP 502 dan OTP yang dibuat untuk pengiriman tersebut dinonaktifkan.
- OTP disimpan sebagai HMAC hash dan diverifikasi dengan secret aplikasi.
- OTP kedaluwarsa setelah 10 menit dan batas percobaan diterapkan per IP serta alamat email.

Jika API mengembalikan error pengiriman, periksa log server (tanpa mencatat kode OTP atau kredensial), pastikan konfigurasi SMTP benar, dan periksa folder Spam. Jangan pernah menambahkan file `.env` berisi kredensial ke Git.

## Pengujian dan build

Jalankan pemeriksaan berikut sebelum mengirim perubahan:

```bash
# Unit test helper OTP
npm test

# Pemeriksaan tipe TypeScript
npm run typecheck

# Production build
npm run build

# Jalankan build production secara lokal
npm start
```

Unit test mencakup format OTP enam digit, normalisasi email, dan perilaku hash. Smoke test HTTP yang dipakai di CI berada di `scripts/smoke-otp-api.cjs`; script ini memeriksa landing page dan respons validasi OTP pada server production. Smoke test tersebut **tidak** mengirim email nyata dan tidak membuktikan kredensial SMTP deployment sudah benar.

## Continuous integration

Workflow [GitHub Actions](.github/workflows/ci.yml) berjalan saat ada push ke `main` atau pull request menuju `main`. Workflow melakukan:

1. Instalasi bersih dependensi melalui `npm ci`.
2. Unit test helper OTP.
3. Type-check TypeScript.
4. Production build Next.js.
5. Menjalankan server hasil build dan melakukan HTTP smoke test terhadap landing page serta penanganan error API OTP.

[**Lihat status CI dan riwayat pengujian**](https://github.com/shadowroot32/cendekia-ai/actions/workflows/ci.yml).

## Struktur repository

```text
.
├── .github/
│   ├── pull_request_template.md
│   └── workflows/ci.yml          # Test, type-check, build, HTTP smoke test
├── scripts/
│   └── smoke-otp-api.cjs         # Smoke test terhadap server production lokal
├── src/
│   ├── app/
│   │   ├── (auth)/login/         # Login OTP
│   │   ├── (dashboard)/          # Dashboard, subjects, library, study, settings
│   │   └── api/                  # API autentikasi dan fitur belajar
│   ├── components/               # Komponen UI, navigasi, dan belajar
│   └── lib/
│       ├── ai/                   # Integrasi provider LLM
│       ├── db/                   # Drizzle client dan skema PostgreSQL
│       ├── auth.ts               # Session JWT dan helper hash OTP
│       ├── email.ts              # Transport SMTP dan template email OTP
│       ├── otp.ts                # Generator, normalisasi, dan hashing OTP
│       ├── rate-limit.ts         # Pembatasan percobaan in-memory
│       └── sm2.ts                # Algoritma spaced repetition SM-2
├── tests/
│   └── otp.test.cjs              # Unit test helper OTP
├── .env.example
├── CONTRIBUTING.md
├── LICENSE
├── README.md
└── SECURITY.md
```

## Catatan keamanan dan deployment

- Konfigurasikan `JWT_SECRET` yang panjang, acak, dan unik untuk production. Jangan menggunakan secret contoh di `.env.example`.
- Mengganti secret dapat membuat sesi lama tidak valid dan OTP yang masih aktif tidak bisa diverifikasi.
- Rate limiter saat ini menyimpan hitungan di memori proses. Untuk deployment multi-instance, gunakan rate limiter bersama seperti Redis agar batas percobaan konsisten antar-instance.
- CI menggunakan kredensial dummy dan sengaja tidak mengirim email sungguhan. Verifikasi pengiriman OTP dengan environment SMTP pada deployment.
- Untuk production, kelola perubahan skema database secara terencana dan lakukan backup sebelum perubahan skema yang berisiko.

## Kontribusi

Baca [CONTRIBUTING.md](CONTRIBUTING.md) sebelum membuat pull request. Pastikan test, type-check, dan build lulus serta jangan sertakan rahasia atau file environment.

## Lisensi

Project ini dirilis di bawah [MIT License](LICENSE).
