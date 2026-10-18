# Kebijakan Keamanan

Keamanan pengguna dan data belajar penting bagi project ini.

## Melaporkan kerentanan

Jangan memublikasikan kredensial, data pribadi, token sesi, atau detail eksploit yang belum diperbaiki pada issue publik. Laporkan kerentanan melalui [GitHub Security Advisories](https://github.com/shadowroot32/cendekia-ai/security/advisories/new) bila fitur tersebut tersedia untuk repository ini. Sertakan langkah reproduksi minimal, dampak yang diamati, dan versi atau commit yang terpengaruh.

## Panduan deploy yang aman

- Simpan seluruh kredensial di environment variables atau secret manager, bukan di repository.
- Gunakan `JWT_SECRET` acak minimal 32 karakter untuk production dan HTTPS untuk aplikasi.
- Daftarkan OAuth callback production yang tepat di Google Cloud; jangan menggunakan konfigurasi lokal pada domain publik.
- Jangan menuliskan OTP, token sesi, API key, password, OAuth authorization code, atau body request sensitif ke log.
- Rate limiter saat ini berbasis memori dan tidak berbagi state antar-instance. Untuk deployment multi-instance, gunakan penyimpanan rate limit bersama.
- Buat backup database sebelum menerapkan perubahan skema ke database yang sudah berisi data; tinjau skema terlebih dahulu.
- Endpoint ekspor hanya dapat dipanggil oleh pengguna yang sudah login, tetapi file hasil ekspor berisi data privat. Pengguna harus menyimpan file unduhan dengan aman.
- Tautan berbagi berfungsi sebagai bearer link: siapa pun yang memiliki URL aktif dapat membaca materi yang dibagikan sampai tautan kedaluwarsa atau dicabut. Jangan membagikan tautan untuk materi rahasia.
- Uji login, alur belajar, ekspor, berbagi, dan penghapusan akun dengan akun serta database uji—bukan data pengguna produksi.
- CI tidak menggunakan kredensial Google/provider AI sungguhan dan tidak membuktikan konfigurasi deployment production. Jalankan verifikasi integrasi terkontrol sebelum membuka layanan ke pengguna.
