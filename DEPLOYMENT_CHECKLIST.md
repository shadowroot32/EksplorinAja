# Checklist Deployment EksplorinAja

Gunakan checklist ini untuk deployment baru atau saat merilis perubahan yang menyentuh login, database, atau fitur belajar.

## Domain custom `eksplorinaja.com` (belum diaktifkan)

Domain kanonis yang dipilih untuk EksplorinAja adalah `https://eksplorinaja.com`. Perubahan kode di PR menyiapkan metadata canonical, Open Graph, `robots.txt`, dan `sitemap.xml`; domain baru aktif setelah domain benar-benar terdaftar, DNS/Cloudflare dikonfigurasi, dan environment production diperbarui.

### 1. Domain dan Cloudflare

- [ ] Pastikan `eksplorinaja.com` sudah dibeli/terdaftar atas akun yang kamu kontrol. Perubahan repository tidak membeli atau mengunci nama domain.
- [ ] Tambahkan domain ke akun Cloudflare yang akan mengelola DNS, lalu ikuti instruksi nameserver dari registrar jika diminta.
- [ ] URL sekarang yang memakai `trycloudflare.com` adalah Quick Tunnel sementara. Jangan jadikan URL tersebut domain production permanen.
- [ ] Jika aplikasi dijalankan di server/PC melalui Cloudflare Tunnel: buat **Named Tunnel** yang persisten di Cloudflare Zero Trust, arahkan Public Hostname `eksplorinaja.com` ke origin aplikasi yang benar (contoh `http://localhost:3000` jika aplikasi memang berjalan di mesin tunnel), dan pastikan host tetap aktif.
- [ ] Jika aplikasi akan berjalan di Cloudflare Pages, hubungkan custom domain dari menu Pages project → Custom domains dan ikuti DNS record yang diberikan Cloudflare. Jangan menyalin record Tunnel untuk deployment Pages.
- [ ] Opsional: tambahkan `www.eksplorinaja.com` lalu buat redirect permanen ke `https://eksplorinaja.com`, supaya hanya ada satu alamat utama.

### 2. Variabel environment production

Atur di environment **host aplikasi** yang benar-benar menjalankan Next.js (jangan commit secret). Jika memakai Cloudflare Pages, atur di build/runtime variables Pages; jika memakai Cloudflare Tunnel ke PC/server, atur di environment proses aplikasi pada mesin tersebut dan restart proses setelah berubah:

| Variabel | Nilai production |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | `https://eksplorinaja.com` |
| `GOOGLE_REDIRECT_URI` | `https://eksplorinaja.com/api/auth/google/callback` |
| `GOOGLE_CLIENT_ID` | Client ID OAuth Web yang sudah diizinkan untuk domain tersebut |
| `GOOGLE_CLIENT_SECRET` | Client Secret OAuth (secret; jangan commit) |
| `JWT_SECRET` | Secret acak unik minimal 32 karakter |
| `DATABASE_URL` | Connection string database production |
| `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL` | Konfigurasi provider AI production |
| `SMTP_FROM` (jika SMTP OTP lama digunakan) | `EksplorinAja <alamat-email-yang-terverifikasi>` |

`NEXT_PUBLIC_APP_URL` juga menjadi sumber canonical URL, alamat Open Graph, `robots.txt`, dan sitemap. Jika variabel ini masih berisi `trycloudflare.com`, hasil metadata akan tetap menggunakan URL itu, jadi harus diganti sebelum rilis.

### 3. Google OAuth

Di Google Cloud Console → Google Auth Platform → Clients, edit OAuth client Web yang dipakai:

- [ ] Authorized JavaScript origins: `https://eksplorinaja.com`
- [ ] Authorized redirect URIs: `https://eksplorinaja.com/api/auth/google/callback`
- [ ] Pertahankan localhost callback/origin hanya jika masih dibutuhkan untuk development.
- [ ] Uji login Google pada domain custom setelah environment dan DNS aktif.

### 4. Pemeriksaan sebelum mengaktifkan domain

- [ ] Buka `https://eksplorinaja.com` melalui HTTPS dan pastikan sertifikat valid.
- [ ] Pastikan tag canonical halaman publik menuju domain tersebut.
- [ ] Pastikan `https://eksplorinaja.com/robots.txt` menunjuk ke `https://eksplorinaja.com/sitemap.xml`.
- [ ] Pastikan `https://eksplorinaja.com/sitemap.xml` hanya memuat URL publik yang memang boleh diindeks; dashboard, API, dan halaman berbagi tidak dimasukkan.
- [ ] Jalankan login Google, pembuatan materi, alur belajar, dan pengiriman email yang digunakan secara nyata.
- [ ] Perubahan konfigurasi pada dokumen ini adalah persiapan saja. DNS, pendaftaran domain, environment Cloudflare, OAuth Console, dan deployment belum diubah dari repository.


## 1. Environment dan secrets

- [ ] Pastikan host mengizinkan koneksi keluar untuk mengunduh model bahasa Tesseract pada penggunaan OCR pertama. Atur `PDF_OCR_LANGS` bila membutuhkan bahasa selain default `eng+ind`.
- [ ] Verifikasi bahwa runtime hosting mengizinkan request upload hingga 90 detik untuk OCR dan pembuatan materi AI.

- [ ] Siapkan PostgreSQL dan pastikan aplikasi dapat terhubung melalui `DATABASE_URL`.
- [ ] Isi `LLM_BASE_URL`, `LLM_API_KEY`, dan `LLM_MODEL` dengan konfigurasi provider AI yang benar.
- [ ] Buat OAuth Client ID bertipe Web di Google Cloud.
- [ ] Daftarkan `https://DOMAIN-ANDA/api/auth/google/callback` sebagai Authorized redirect URI Google.
- [ ] Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, dan `NEXT_PUBLIC_APP_URL` untuk domain production.
- [ ] Buat `JWT_SECRET` unik dan acak minimal 32 karakter.
- [ ] Jangan gunakan nilai placeholder dari `.env.example` pada production.

## 2. Database

- [ ] Buat backup database sebelum perubahan skema pada database yang berisi data.
- [ ] Jalankan `npx drizzle-kit push` dengan `DATABASE_URL` yang mengarah ke database target.
- [ ] Jika menerapkan skema secara manual, verifikasi bahwa SQL `drizzle/0001_stage3_learning_features.sql` dijalankan pada database lama yang sudah memiliki tabel `users` dan `study_sets`.
- [ ] Pastikan tabel `cornell_notes` dan `study_set_shares` tersedia sebelum memakai Cornell Notes atau tautan berbagi.
- [ ] Jangan mengarahkan perintah sinkronisasi skema ke database produksi tanpa meninjau diff dan memiliki backup yang dapat dipulihkan.

## 3. Verifikasi rilis

- [ ] Jalankan `npm ci`, `npm test`, `npm run typecheck`, dan `npm run build`.
- [ ] Pastikan GitHub Actions berstatus sukses pada commit yang akan dirilis.
- [ ] Buka aplikasi melalui HTTPS dan uji login Google menggunakan akun uji.
- [ ] Uji buat materi, pembuatan ringkasan/flashcard/kuis AI, review flashcard, Cornell Notes, mind map, podcast script, dan ekspor JSON.
- [ ] Buat tautan berbagi uji; pastikan dapat dibuka saat aktif lalu tidak dapat dibuka setelah dicabut/kedaluwarsa.
- [ ] Uji penghapusan akun hanya pada akun uji, bukan akun dengan data yang ingin dipertahankan.
- [ ] Periksa log deployment untuk error database atau provider AI; jangan log credentials, token, atau konten privat.

## 4. Batasan dan pekerjaan lanjutan

- Rate limiter masih berbasis memori. Untuk beberapa instance/replica, pindahkan limit ke penyimpanan bersama seperti Redis.
- CI menggunakan placeholder untuk build dan smoke test, bukan kredensial OAuth/provider AI atau database production. Pengujian integrasi sungguhan tetap wajib.
- Podcast menghasilkan naskah dan membacakannya lewat browser; pembuatan serta penyimpanan MP3 belum tersedia.
- Ekspor JSON dapat berisi isi materi belajar dan riwayat chat. Perlakukan berkas seperti data pribadi.
- Fitur share bersifat bearer-link: siapa pun yang memiliki URL aktif dapat membaca materi yang dibagikan.


## 5. Deploy dari Windows PC/server sendiri

Script `scripts/deploy-selfhosted.ps1` menjalankan `npm ci`, test, type-check, build production, lalu menjalankan Next.js pada `127.0.0.1:3000`. Script hanya berjalan dari branch `main` dengan working tree bersih dan memeriksa keberadaan variabel environment tanpa mencetak nilainya.

1. Pastikan Node.js 22, Git, PostgreSQL, dan `cloudflared` sudah terpasang pada mesin yang akan menjalankan aplikasi.
2. Di folder repository, jalankan `git switch main` lalu `git pull --ff-only origin main`. Pastikan perubahan lokal yang belum disimpan sudah diamankan.
3. Buat file lokal `.env.production` dan isi variabel production yang valid. Gunakan `deploy/cloudflare-production.env.example` sebagai daftar variabel, tetapi jangan menyalin placeholder. Jangan commit `.env.production`.
4. Pastikan database production sudah tersedia dan skema terbaru sudah diterapkan dengan backup yang dapat dipulihkan. Script deploy tidak menjalankan migrasi database otomatis.
5. Buka PowerShell di root repository dan jalankan:

   ```powershell
   Set-ExecutionPolicy -Scope Process Bypass
   .\scripts\deploy-selfhosted.ps1
   ```

6. Biarkan jendela server tetap terbuka. Dari jendela PowerShell lain, uji `http://127.0.0.1:3000` sebelum membuka tunnel.
7. Untuk demo sementara saja, jalankan `cloudflared tunnel --url http://127.0.0.1:3000` di jendela terpisah. URL `trycloudflare.com` yang dihasilkan bersifat sementara dan bisa berubah. Jangan mengandalkannya untuk hosting permanen.
8. Karena domain `eksplorinaja.com` belum dibeli, jangan menganggap alamat itu sudah dapat diakses. Google OAuth juga hanya akan bekerja pada hostname yang cocok dengan origin dan callback yang didaftarkan di Google Cloud. Untuk demo via Quick Tunnel, URL callback berubah-ubah sehingga bukan pengganti domain tetap.

Script ini tidak mengatur Windows Service/Task Scheduler, membuka port router, mengubah DNS, mendaftarkan domain, membuat Named Tunnel, atau mengatur Google OAuth. Untuk operasi 24/7, siapkan proses Next.js dan Named Tunnel persisten setelah domain terdaftar; jangan menjalankan server sebagai administrator kecuali memang dibutuhkan.
