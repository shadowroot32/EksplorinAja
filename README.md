# 🐴 Cendekia.ai - Open-Source AI Learning Workspace

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![Python: 3.10+](https://img.shields.io/badge/Python-3.10%2B-teal.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100%2B-009688.svg)](https://fastapi.tiangolo.com)
[![Self-Hosted](https://img.shields.io/badge/Platform-Self--Hosted%20%7C%20Free-10b981.svg)]()
[![OWASP Hardened](https://img.shields.io/badge/Security-OWASP%20Hardened-blue.svg)]()

> **Cendekia.ai** adalah platform *AI Learning Workspace* open-source yang dirancang untuk pelajar, mahasiswa, dan peneliti. Mengubah dokumen kuliah (PDF), video YouTube, dan catatan teks menjadi ringkasan cerdas, kartu hafalan 3D (*Spaced Repetition SM-2*), kuis adaptif, podcast audio, dan video pembelajaran visual ala NotebookLM — **100% gratis, mandiri (self-hosted), dan tanpa paywall / kuota token**.

---

## ✨ Fitur Unggulan

### 1. 📥 Multi-Source Document Ingestion
- **PDF Ingestion**: Ekstraksi teks dari berkas presentasi, buku teks, dan jurnal ilmiah via `pypdf`.
- **YouTube Transcripts**: Penarikan transkrip otomatis langsung dari URL video YouTube (`youtube_transcript_api`).
- **Freeform Notes**: Editor teks langsung untuk materi kuliah atau catatan cepat.

### 2. 🧠 AI Study Generation Engine
- **Ringkasan Komprehensif**: Poin-poin konsep kunci, glosarium istilah teknis, dan analogi pembelajaran.
- **Smart 3D Flashcards (SM-2 Spaced Repetition)**: Algoritma interval pengulangan memori berbasis SuperMemo SM-2. Menyesuaikan jadwal review kartu secara adaptif berdasarkan tingkat kesulitan.
- **Kuis Pilihan Ganda Interaktif**: Evaluasi pemahaman instan dengan umpan balik visual dan kotak penjelasan mendalam.
- **AI Chat Asisten Berbasis Konteks**: Tanya jawab langsung dengan dokumen materi yang telah diunggah.
- **Podcast Audio & Video Sintesis**: Generator skrip podcast dua arah dan modul video visual beranimasi per segmen topik (NotebookLM-style).

### 3. 🛡️ Keamanan & Kestabilan Produksi (OWASP-Compliant)
- **Zero Heavy Stack**: Backend berbasis **FastAPI** ringan dengan database **SQLite Write-Ahead Logging (WAL mode)** berkecepatan tinggi tanpa beban setup server database eksternal.
- **Rate-Limiting Multi-Tier**: Proteksi terhadap brute-force login dan abuse pembuatan materi AI via sliding-window tracker.
- **Autentikasi Aman**: Pengiriman kode OTP 6 digit melalui Gmail SMTP TLS port 587, session token berbasis hex berkekuatan tinggi, dan isolasi ketat antar pengguna.
- **Single Page Application (SPA)**: Frontend tanpa framework berat (Vanilla JS + Tailwind CSS + Lucide Icons), performa rendering instan di semua perangkat.

### 4. 🔌 Model Context Protocol (MCP) Server Support
- Dilengkapi berkas `mcp_server.py` untuk menghubungkan basis pengetahuan Cendekia.ai ke berbagai AI Agent dan IDE (Claude Desktop, Hermes Agent, Cursor, VS Code).

---

## 🏗️ Arsitektur Proyek

```text
cendekia-ai/
├── app.py                # Backend FastAPI, API endpoints, auth, dan rate limiter
├── database.py           # Layer database SQLite WAL, skema tabel, dan query
├── ai_engine.py          # Generator AI (LLM caller, PDF parser, YouTube extractor, SM-2)
├── mcp_server.py         # Integrasi Model Context Protocol (MCP)
├── requirements.txt      # Dependensi Python
├── run_web.bat           # Skrip start cepat Windows
├── run_mcp.bat           # Skrip runner MCP server
├── .env.example          # Template konfigurasi environment
├── LICENSE               # Lisensi Open Source (MIT)
├── static/               # Frontend Single Page Application
│   ├── index.html        # Antarmuka SPA terpadu & styling
│   └── app.js            # Router view SPA, state management, SM-2 client logic
```

---

## 🚀 Panduan Instalasi Cepat

### Prasyarat
- Python 3.10 atau versi lebih baru
- Git
- Provider LLM (Ollama lokal, LM Studio, vLLM, OpenAI, atau LLM proxy port lokal)

### 1. Kloning Repositori
```bash
git clone https://github.com/shadowroot32/cendekia-ai.git
cd cendekia-ai
```

### 2. Buat & Aktifkan Virtual Environment
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Linux / macOS
python3 -m venv venv
source venv/bin/activate
```

### 3. Pasang Dependensi
```bash
pip install -r requirements.txt
```

### 4. Konfigurasi Environment (`.env`)
Salin template konfigurasi:
```bash
cp .env.example .env
```
Buka file `.env` dan atur parameter sesuai server Anda:
```env
LLM_BASE_URL=http://localhost:20128/v1
LLM_API_KEY=your_key_or_empty_for_local_ollama
LLM_MODEL=your_model_name

# Konfigurasi SMTP (Opsional, untuk pengiriman OTP email)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
```

### 5. Jalankan Aplikasi
```bash
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```
Akses platform di peramban: `http://localhost:8000`

---

## 🌐 Panduan Deploy ke Linux VM / Proxmox (Systemd)

Untuk menjalankan Cendekia.ai secara permanen di latar belakang sebagai layanan sistem Linux:

1. Buat berkas service:
```bash
sudo nano /etc/systemd/system/cendekia.service
```

2. Masukkan konfigurasi berikut (sesuaikan path):
```ini
[Unit]
Description=Cendekia.ai Open-Source AI Learning Workspace
After=network.target

[Service]
User=youruser
WorkingDirectory=/path/to/cendekia-ai
ExecStart=/path/to/cendekia-ai/venv/bin/uvicorn app:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=5
EnvironmentFile=/path/to/cendekia-ai/.env

[Install]
WantedBy=multi-user.target
```

3. Aktifkan dan jalankan service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now cendekia.service
```

---

## 🤝 Panduan Kontribusi (Contributing)

Kontribusi dari komunitas sangat disambut untuk membuat Cendekia.ai semakin canggih!

1. **Fork** repositori ini ke akun GitHub Anda.
2. Buat branch baru untuk fitur atau perbaikan bug:
   ```bash
   git checkout -b feature/nama-fitur-baru
   ```
3. Lakukan commit perubahan Anda dengan pesan yang jelas:
   ```bash
   git commit -m "feat: tambahkan fitur ekspor flashcard ke Anki"
   ```
4. Push ke branch Anda:
   ```bash
   git push origin feature/nama-fitur-baru
   ```
5. Buka **Pull Request (PR)** baru di GitHub dan jelaskan perubahan yang Anda buat.

### Ide Pengembangan (Roadmap Terbuka):
- [ ] Ekspor flashcards ke format Anki (.apkg)
- [ ] Dukungan ekstraksi dokumen audio (Whisper STT offline)
- [ ] Mode kolaborasi studi grup real-time
- [ ] Ekstensi peramban Chrome untuk clipping materi kuliah instan

---

## 📄 Lisensi

Proyek ini dirilis di bawah lisensi terbuka [MIT License](LICENSE). Bebas digunakan, dimodifikasi, dan didistribusikan untuk keperluan pendidikan maupun komersial.
