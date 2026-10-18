# Panduan Kontribusi

Terima kasih sudah membantu mengembangkan Cendekia.ai.

## Alur kerja

1. Fork repository atau buat branch dari `main`.
2. Buat perubahan kecil dengan tujuan yang jelas.
3. Untuk perubahan autentikasi, keamanan, database, atau UI, jelaskan perilaku yang berubah dan cara pengujiannya.
4. Jalankan pemeriksaan lokal sebelum membuka pull request.
5. Gunakan template pull request agar dampak perubahan dapat ditinjau dengan mudah.

## Pemeriksaan sebelum pull request

```bash
npm ci
npm test
npm run typecheck
npm run build
```

Jika perubahan memengaruhi response API atau halaman pengguna, tambahkan atau perbarui tes yang sesuai. Jangan mengklaim pengiriman email sungguhan telah teruji kecuali memakai konfigurasi SMTP pada lingkungan uji yang terisolasi.

## Gaya dan keamanan

- Ikuti pola komponen dan struktur folder yang sudah ada.
- Utamakan TypeScript yang eksplisit dan penanganan error yang jelas.
- Jangan commit `.env`, API key, password, OTP asli, data pengguna, atau log yang berisi informasi sensitif.
- Jangan menurunkan keamanan validasi atau rate limit untuk membuat test lulus.
- Untuk perubahan skema, jelaskan dampaknya terhadap database yang sudah berisi data.
- Perubahan yang menyentuh autentikasi harus mempertahankan masa berlaku, penggunaan satu kali, dan penanganan error yang aman.

## Pesan commit

Gunakan pesan singkat dengan kata kerja, misalnya:

- `Fix OTP verification error handling`
- `Improve dashboard empty state`
- `Document SMTP setup`

## Pull request

Jelaskan masalah yang diselesaikan, solusi yang dipilih, hasil pengujian, dan perubahan konfigurasi atau migrasi yang diperlukan.
