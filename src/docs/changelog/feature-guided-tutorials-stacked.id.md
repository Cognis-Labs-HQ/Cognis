# Tutorial terpandu

**Feature Branch:** feature-guided-tutorials-stacked

Menu akun membuka katalog tutorial. Komponen dan modul eksternal yang aktif menyediakan alur terjemahan yang dapat diulang melalui `ui:tutorials`. Alur memakai target semantik, navigasi SPA dengan pemeriksaan akses, serta langkah yang dapat dibatalkan; dialog wajib selalu didahulukan. Lihat [kontrak tutorial](/docs/tutorials).

Host mengelola tampilan, aksesibilitas, pembatasan peristiwa, pencarian target dan pembersihan siklus hidup. Contoh ruang kerja dan Study berada di komponen pemiliknya. Modul eksternal mendaftarkan alur dan target melalui ctx tanpa mengimpor implementasi internal host. Pengujian mencakup flow terdaftar, target hilang atau diganti, pembatalan asinkron, izin, pemulihan kegagalan penyedia dan handle kedaluwarsa. Pemeriksaan Chromium mencakup fokus, gulir, zoom, pembatasan papan ketik dan sentuhan, peran aksesibilitas, pengurangan gerakan dan kedua tema.

## Komit

- [5669952](https://github.com/Cognis-Labs-HQ/Cognis/commit/5669952b50bfd854a678b8b077341d3200b4dca6)
