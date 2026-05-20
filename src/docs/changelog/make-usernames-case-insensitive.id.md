# Nama Pengguna & Kata Sandi

## Nama pengguna kini tidak peka huruf besar/kecil dan hanya ASCII

Nama pengguna dinormalisasi ke huruf kecil saat pendaftaran dan login. Hanya karakter ASCII yang dapat dicetak yang diizinkan, dengan panjang maksimal 25 karakter. Nama pengguna yang tidak valid ditolak dengan kode kesalahan yang jelas.

## Kebijakan kata sandi dapat dikonfigurasi di Administrasi → Keamanan

Administrator kini dapat menetapkan kebijakan kata sandi di bawah Administrasi → Keamanan. Kriteria yang dapat dikonfigurasi: panjang minimum, huruf kapital, huruf kecil, angka, dan karakter khusus. Kebijakan berlaku untuk pendaftaran dan perubahan kata sandi.

## Pemeriksaan kriteria kata sandi secara langsung saat pendaftaran dan reset kata sandi

Selama pendaftaran, kolom kata sandi menampilkan umpan balik langsung saat Anda mengetik, menunjukkan kriteria yang belum terpenuhi. Kolom konfirmasi menampilkan pesan peringatan secara real time jika kata sandi tidak cocok.

## Modul pemeriksaan kriteria yang dapat digunakan kembali

Fungsi baru `attachCriteriaCheck` di `src/ui/reuse/criteria-check.js` menyediakan validasi langsung yang fleksibel dan aksesibel untuk kolom formulir apa pun. Setiap kriteria dapat memiliki pesan kegagalan sendiri; pesan umum yang dapat dikonfigurasi digunakan sebagai cadangan.
