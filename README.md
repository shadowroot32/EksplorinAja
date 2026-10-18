# 🐴 Cendekia.ai v2 - Full-Stack AI Learning Workspace

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![Next.js: 15+](https://img.shields.io/badge/Next.js-15%2B-black.svg)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-blue.svg)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8.svg)](https://tailwindcss.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791.svg)](https://www.postgresql.org)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle%20ORM-latest-C5F74F.svg)](https://orm.drizzle.team)

> **Cendekia.ai v2** adalah platform *AI Learning Workspace* generasi kedua yang dibangun ulang secara penuh menggunakan arsitektur modern **Full-Stack Next.js 15 (App Router)**, **TypeScript**, **Drizzle ORM**, dan **PostgreSQL**.

---

## ✨ Fitur Utama

- 📥 **Multi-Source Ingestion**: Drop file PDF (`pdf-parse`) atau link video YouTube (`youtube-transcript`), serta catatan bebas.
- 🧠 **AI-Powered Learning Assets**: Ringkasan berstruktur, kartu hafalan (*flashcards*), kuis pilihan ganda, dan AI chat tutor berbasis konteks dokumen.
- 🗂️ **SuperMemo SM-2 Spaced Repetition**: Algoritma interval pengulangan memori adaptif dengan antarmuka 3D flip card.
- 🔐 **Passwordless OTP Email Auth**: Autentikasi berbasis kode OTP 6 digit via SMTP/Gmail, tanpa password, dengan sesi secure JWT (`jose`) dan cookie `httpOnly`.
- 🎨 **Modern Minimalist UI**: Palet warna gelap terfokus (Emerald `#10b981`, Teal `#14b8a6`, Dark Slate `#0f172a`) dengan Tailwind CSS v4.
- ⚡ **Production-Ready & Self-Hosted**: 100% open-source, bebas biaya langganan, dan siap di-deploy secara mandiri di Proxmox/Linux VM atau cloud provider.

---

## 🏗️ Struktur Proyek

```text
cendekia-ai-v2/
├── src/
│   ├── app/
│   │   ├── (auth)/login/            # Halaman login OTP
│   │   ├── (dashboard)/             # Protected layout & views (dashboard, subjects, library, study, settings)
│   │   ├── api/                     # Next.js API Routes (auth, dashboard, study-sets, subjects, user)
│   │   ├── globals.css              # Tailwind v4 configuration & theme
│   │   ├── layout.tsx               # Root layout
│   │   └── page.tsx                 # Public landing page
│   ├── components/                  # UI components (FlashcardViewer, QuizPlayer, ChatInterface, Navbar)
│   ├── lib/
│   │   ├── ai/engine.ts             # Vercel AI SDK integration (OpenAI-compatible)
│   │   ├── db/                      # Drizzle ORM client & PostgreSQL schema (12 tables)
│   │   ├── auth.ts                  # JWT token creation & verification
│   │   ├── email.ts                 # Nodemailer SMTP transport
│   │   ├── rate-limit.ts            # In-memory sliding window rate limiter
│   │   └── sm2.ts                   # SuperMemo SM-2 algorithm implementation
│   └── types/                       # TypeScript interfaces
├── drizzle.config.ts                # Drizzle Kit configuration
├── next.config.ts                   # Next.js build config
└── package.json                     # Scripts & dependencies
```

---

## 🚀 Panduan Memulai Cepat

### Prasyarat
- Node.js 20+ & npm
- PostgreSQL database (lokal, Docker, atau remote VM)
- Provider LLM (Ollama, LM Studio, vLLM, OpenAI, atau LLM local proxy)

### 1. Salin Konfigurasi Environment
```bash
cp .env.example .env
```
Sesuaikan konfigurasi di berkas `.env`:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/cendekia
LLM_BASE_URL=http://localhost:20128/v1
LLM_API_KEY=your_key_or_local
LLM_MODEL=your_model_name
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_specific_password
JWT_SECRET=generate_a_random_32_character_string_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. Pasang Dependensi
```bash
npm install
```

### 3. Migrasi Skema Database ke PostgreSQL
```bash
npx drizzle-kit push
```

### 4. Jalankan Aplikasi
```bash
# Mode Development
npm run dev

# Mode Production Build
npm run build
npm start
```
Buka peramban di `http://localhost:3000`.

---

## 📄 Lisensi
Didistribusikan di bawah lisensi terbuka [MIT License](LICENSE).
