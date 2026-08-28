# Halaman Kesalahan

**Feature Branch:** copilot/add-error-page-feature

## Halaman kesalahan yang dapat dinavigasi dengan judul gradien animasi

Halaman `/error` khusus kini tersedia. Navigasikan langsung dengan parameter
kueri `?code=` (misalnya `/error?code=404`) atau tampil otomatis saat URL tidak
dikenali.

Halaman ini menampilkan judul kode kesalahan besar dengan gradien animasi
mengalir yang menggunakan perpaduan warna teal-to-navy yang sama seperti bilah
navigasi global. Deskripsi kesalahan dalam bahasa sehari-hari ditampilkan di
bawah judul beserta tombol untuk kembali ke dasbor.

Saat pengguna sudah masuk, halaman dirender di dalam shell dasbor lengkap
dengan bilah navigasi, topbar, dan footer. Saat pengguna belum masuk,
ditampilkan sebagai pesan layar penuh tanpa chrome shell. Judul menyesuaikan
skala secara responsif agar tetap mudah dibaca di layar kecil.

## Commits

- [7a82d10](https://github.com/Cognis-Labs-HQ/Cognis/commit/7a82d1050c2453aaca2165271dbf75ae2f2c9876)
