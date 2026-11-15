# Rincian Avatar Pembaca

**Cabang Fitur:** feature-message-receipt-integration

## Avatar Pembaca Kanonis

Profile 4.1.0 menambahkan `tiny` (1.22rem, inisial 0.5rem) dan `compact` (1.65rem, inisial 0.6rem) pada `buildContent`. Daftar tetap `contentSizes` mengumumkan kelima nama ukuran. Ukuran ini adalah ukuran gambar, bukan sasaran penunjuk. Pemanggil mengelola sasaran yang dapat diakses secara terpisah, jarak, dan cincin pemisah luar. Arti `small`, `medium`, `large`, dan opsi `buildMarkup` tetap sama. Konsumen ukuran baru harus memeriksa daftar yang diumumkan serta merilis JavaScript dan CSS Profile yang sesuai. Messages 2.9.0 memakai kedua ukuran; rilis asetnya bersama-sama. Tutorial Profile tetap menggunakan kontrol dan ukuran avatar saat ini.

## Panel Pembaca Aksesibel

Pilih **Dibaca oleh** di samping pesan terkirim untuk melihat pembaca dan waktu baca. Panel dapat dibuka dengan sentuhan, klik, atau papan ketik. Tutup atau Escape mengembalikan fokus ke tombol saat ini; Escape menutup pratinjau profil aktif terlebih dahulu. Tab mengikuti urutan halaman biasa. Arahkan penunjuk atau fokuskan avatar pembaca untuk pratinjau profil; pilih untuk membuka profil. Catatan tanpa nama pengguna profil menampilkan avatar bernama tanpa tautan. Avatar pembaca tidak menunjukkan ketersediaan. Lingkaran kecil mempertahankan ukurannya di dalam sasaran 44px yang terpisah dan tidak tumpang tindih. Daftar panjang membungkus dan panel rincian dapat digulir dalam layar.

## Komit

- [16fac9bdcdf56e9fb797d789b7580d01f394004d](https://github.com/Cognis-Labs-HQ/Cognis/commit/16fac9bdcdf56e9fb797d789b7580d01f394004d)
