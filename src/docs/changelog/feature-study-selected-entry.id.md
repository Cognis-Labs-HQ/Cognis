# Buka Bahasa Belajar Pilihan

**Cabang Fitur:** feature-study-selected-entry

## Langsung Ke Explore

Membuka `/study` langsung menampilkan Explore untuk bahasa tersedia yang dipilih. Pilihan mengikuti navigasi Study: bahasa terdaftar yang sengaja dipilih dipertahankan meskipun belum diikuti; jika tidak ada, bahasa pertama yang tersedia dan diikuti digunakan. Tanpa pilihan atau pendaftaran yang valid, pengguna daring diarahkan ke pengaturan bahasa. Katalog atau penyedia Explore yang tidak tersedia membuka halaman tidak tersedia yang sudah ada. Metadata luring yang belum tersimpan menampilkan halaman Study kosong melalui Page Composer.

## Navigasi Dan Panduan

Alur `study:navigation:enter` memiliki tahap `resolve` dan `navigate`. Alur ini menggunakan model navigasi Study bersama dan skema penyedia, lalu memanggil `ui:navigate` dengan penggantian riwayat dan bahasa yang dipilih. Tautan langsung ke konten, dek, Library, dan halaman Study lainnya tetap menuju tujuan semula. Resolusi tertunda dibatalkan saat halaman diganti, operasi dibatalkan, atau penyedia dilepas; perubahan pendaftaran dan penyedia memicu resolusi baru. Penolakan akses diteruskan, pembatalan router dihormati, dan direktori bahasa tidak ditampilkan selama menunggu.

Target tutorial `modules` yang hanya digunakan direktori lama dihapus. Panduan eksternal harus menargetkan navigasi saat ini atau kontennya sendiri, bukan direktori yang telah dihapus.

## Komit

- [901418a110ee91975861d2232a8a2d2bbb4c0b20](https://github.com/Cognis-Labs-HQ/Cognis/commit/901418a110ee91975861d2232a8a2d2bbb4c0b20)
- [afdd5e7af532e18b2f2c39c77b4c477036b4ea5b](https://github.com/Cognis-Labs-HQ/Cognis/commit/afdd5e7af532e18b2f2c39c77b4c477036b4ea5b)
- [b45e83afb36dae5bd6049d41f24cecb88b3ce864](https://github.com/Cognis-Labs-HQ/Cognis/commit/b45e83afb36dae5bd6049d41f24cecb88b3ce864)
