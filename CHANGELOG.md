# Changelog

## Tema, bahasa, sidebar, dan mode fokus

- Memperbaiki pemilihan tema agar varian gelap Tailwind mengikuti tema aplikasi, bukan preferensi gelap sistem operasi.
- Mengganti select bahasa bawaan browser dengan menu pilihan bahasa bergaya aplikasi.
- Menambahkan sidebar desktop yang dapat diciutkan menjadi icon rail; lebar konten dan header mengikuti perubahan, preferensi tersimpan.

- Menambahkan pengalih tema terang/gelap global yang menyimpan preferensi di localStorage.
- Menambahkan pilihan bahasa Bahasa Indonesia/English yang berlaku di navigasi, dasbor, perpustakaan, mata pelajaran, ulasan, pengaturan, dan workspace belajar.
- Mempertahankan mode fokus workspace serta menerapkan kontras yang sesuai saat tema diganti.
- Menyesuaikan kontrol bahasa pada layar mobile dan memperbarui waktu/tanggal agar mengikuti bahasa yang dipilih.


## Workspace belajar terpadu

- Mengganti halaman belajar sederhana menjadi workspace dengan tab Document, Summaries, Notes, Flashcards, Mind Map, dan Artifacts.
- Menambahkan mode fokus, statistik flashcard/kuis, pembaca dokumen dengan outline heading, dan ringkasan yang dapat disalin.
- Menampilkan flashcard dalam grid; jawaban dibuka per kartu dan penilaian mengirim grade ke sistem spaced repetition.
- Memindahkan quiz, naskah podcast, dan kontrol share ke tab Artifacts.
- Menambahkan edit dokumen, penyimpanan perubahan sumber, dan preview revisi AI sebelum disimpan.
- Memastikan endpoint edit memverifikasi sesi serta kepemilikan study set; perubahan source tidak otomatis meregenerasi summary/flashcard/quiz.


## Tahap 5 — OCR fallback untuk PDF scan

- Menambahkan Tesseract.js sebagai fallback jika ekstraksi teks asli PDF menghasilkan kurang dari 40 karakter.
- PDF dirender sebagai PNG oleh `pdf-parse`, lalu OCR dijalankan maksimal pada 8 halaman pertama.
- Membatasi waktu OCR ke 25 detik, membatasi hasil teks mengikuti batas input yang sudah ada, dan menggunakan cache model pada path sementara yang dapat ditulis.
- Menambahkan error berbeda untuk timeout, layanan OCR yang tidak tersedia, dan teks yang tidak berhasil dikenali.
- Menambahkan uji unit untuk aturan fallback dan batas OCR serta dokumentasi konfigurasi `PDF_OCR_LANGS`.


Catatan ini merangkum fitur yang telah ditambahkan pada tahapan pengembangan Cendekia.ai dan pekerjaan yang masih perlu dilakukan sebelum rilis production. Ini bukan bukti bahwa konfigurasi deployment pengguna telah diuji.

## Tahap 4 — Portabilitas data dan pemolesan akhir

- Menambahkan endpoint terautentikasi `GET /api/user/export` untuk mengunduh profil, mata pelajaran, materi, flashcard, kuis, Cornell Notes, naskah podcast, chat, progres, aktivitas, dan metadata share sebagai JSON.
- Tidak menyertakan session/OTP credentials, API keys, atau hash/token rahasia tautan berbagi pada ekspor.
- Menambahkan tombol ekspor data pada Settings.
- Memperbaiki feedback saat pengaturan dimuat/disimpan, ekspor gagal, atau penghapusan akun gagal; tombol aksi menunjukkan status berjalan.
- Membatasi panjang field profil dan menolak update profil kosong/field tak dikenal.
- Menonaktifkan cache untuk respons privat profil dan ekspor.
- Memperbarui smoke test autentikasi agar mencakup endpoint ekspor data.
- Memigrasikan route guard dari konvensi `middleware.ts` ke `proxy.ts` yang didukung Next.js 16.
- Merapikan README dan menambahkan checklist deployment ini.

## Tahap 3 — Fitur belajar tambahan

- Cornell Notes tersimpan per materi.
- Mind map dibuat dari materi saat diminta dan divalidasi sebelum dikirim ke UI.
- Naskah podcast tersimpan; pembacaan menggunakan text-to-speech bawaan browser.
- Tautan dokumen baca-saja dengan masa berlaku 1, 7, atau 30 hari dan kemampuan pencabutan. Token mentah tidak disimpan di database.

## Tahap 2 — Progres belajar

- Review flashcard berbasis jadwal spaced repetition.
- Statistik/progres belajar pada dashboard.
- Penilaian kuis dilakukan di server agar jawaban tidak perlu dipercaya dari client.

## Tahap 1 — Autentikasi

- Google OAuth dengan state, nonce, PKCE S256, pemeriksaan issuer/audience, dan verifikasi email.
- Session cookie HTTP-only serta konfigurasi melalui environment variables.

## Sebelum production

Buka [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md). Poin penting: konfigurasi OAuth/provider nyata belum diverifikasi oleh CI; database perlu disinkronkan dengan schema terbaru; backup perlu dibuat sebelum mengubah database berisi data; dan rate limiting bersama dibutuhkan untuk deployment multi-instance.
