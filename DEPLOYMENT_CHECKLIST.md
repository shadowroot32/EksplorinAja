# Checklist Deployment Cendekia.ai

Gunakan checklist ini untuk deployment baru atau saat merilis perubahan yang menyentuh login, database, atau fitur belajar.

## 1. Environment dan secrets

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
