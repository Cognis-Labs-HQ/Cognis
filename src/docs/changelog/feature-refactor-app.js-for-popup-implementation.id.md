# Popup entri Pustaka yang dapat disusun

**Cabang Fitur:** feature-refactor-app.js-for-popup-implementation

## Detail entri berbasis rute

Entri Pustaka dibuka dalam popup bersih yang mengikuti riwayat, dengan metadata yang tersedia, relasi, navigasi sebelumnya dan berikutnya, serta gaya tombol menu pengguna yang konsisten pada navigasi Study.

## Penyusunan detail yang dapat diperluas

Alur detail dideklarasikan sebelum penyedia UI dimuat, mempertahankan urutan sebelum inti, inti, dan setelah inti, mendukung hook yang dapat dilepas, serta menjalankan tindakan popup kontribusi.

## Siklus halaman yang andal

Pemuatan langsung dan transisi SPA memakai siklus penyusun halaman terautentikasi standar dengan submenu Study satu baris yang berukuran konsisten. Tautan entri kanonis tetap dapat dibagikan, pemasangan yang dibatalkan tidak membuka popup usang, dan kontrol tutup popup berfungsi secara normal. URL Study tidak lagi membawa parameter kueri `language`; tombol bahasa aktif menyimpan kode ISO dan menyediakan pilihan saat navigasi.

## Navigasi bahasa milik Study

Study kini menangani navigasi tombol bahasa melalui pengikatan kapabilitas UI miliknya sendiri tanpa mengaitkan router aplikasi inti dengan status Study. Rute entri langsung menentukan bahasa skemanya sebelum dirender dan daftar yang dimuat langsung merespons navigasi Kembali dengan benar.

## Infrastruktur browser milik Study

Rute SPA Study, penemuan komponen anak, invalidasi cache, dan kontrak alur detail Pustaka kini berada di gateway Study. Perutean inti dan pencocokan pencarian global tidak lagi memuat jalur, API, selektor, atau metadata komponen khusus Study.

## Komit

- [f25e2f64](https://github.com/Cognis-Labs-HQ/Cognis/commit/f25e2f649aadef46a713e85d70d627370f60ba5c)
- [160cbba5](https://github.com/Cognis-Labs-HQ/Cognis/commit/160cbba5e9344f11c429f4c8f8ae2ba4ceda468b)
- [a6b4a095](https://github.com/Cognis-Labs-HQ/Cognis/commit/a6b4a09575d55c2d74e28d58a85beecd832e8c6c)
- [fc4bd3f5](https://github.com/Cognis-Labs-HQ/Cognis/commit/fc4bd3f53c620345d597e94cdfd5f8b611b5c02c)
- [e0e89430](https://github.com/Cognis-Labs-HQ/Cognis/commit/e0e894300370247239ce4b1811a56336db0b3e1c)
- [13886e88](https://github.com/Cognis-Labs-HQ/Cognis/commit/13886e885724482b15279da0c5f0e949ab16fdc9)
- [04cbf360](https://github.com/Cognis-Labs-HQ/Cognis/commit/04cbf3609557d0760bcd7cbfec836a850509c550)
