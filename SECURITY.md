# Kebijakan Keamanan

Keamanan pengguna dan data belajar penting bagi project ini.

## Melaporkan kerentanan

Jangan memublikasikan kredensial, data pribadi, token sesi, atau detail eksploit yang belum diperbaiki pada issue publik. Laporkan kerentanan melalui [GitHub Security Advisories](https://github.com/shadowroot32/cendekia-ai/security/advisories/new) bila fitur tersebut tersedia untuk repository ini. Sertakan langkah reproduksi minimal, dampak yang diamati, dan versi atau commit yang terpengaruh.

## Panduan deploy yang aman

- Simpan seluruh kredensial di environment variables atau secret manager, bukan di repository.
- Gunakan `JWT_SECRET` acak minimal 32 karakter untuk production.
- Gunakan SMTP dengan autentikasi yang didukung provider; untuk Gmail, gunakan Google App Password dan jangan gunakan password akun biasa.
- Jangan menuliskan OTP, token sesi, API key, password, atau body request sensitif ke log.
- Rate limiter OTP yang sekarang berbasis memori tidak berbagi state antar-instance. Untuk deployment berskala lebih dari satu instance, gunakan penyimpanan rate limit bersama.
- Uji alur login dengan akun dan database uji, bukan data pengguna produksi.
