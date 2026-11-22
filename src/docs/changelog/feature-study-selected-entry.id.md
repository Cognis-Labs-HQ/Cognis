# Buka Bahasa Belajar Pilihan

**Cabang Fitur:** feature-study-selected-entry

## Langsung Ke Explore

Membuka `/study` langsung menampilkan Explore untuk bahasa tersedia yang dipilih. Pilihan mengikuti navigasi Study: bahasa terdaftar yang sengaja dipilih dipertahankan meskipun belum diikuti; jika tidak ada, bahasa pertama yang tersedia dan diikuti digunakan. Tanpa pilihan atau pendaftaran yang valid, pengguna daring diarahkan ke pengaturan bahasa. Katalog atau penyedia Explore yang tidak tersedia membuka halaman tidak tersedia yang sudah ada. Metadata luring yang belum tersimpan menampilkan halaman Study kosong melalui Page Composer.

## Navigasi Dan Panduan

Alur `study:navigation:enter` memiliki tahap `resolve` dan `navigate`. Alur ini menggunakan model navigasi Study bersama dan skema penyedia, lalu memanggil `ui:navigate` dengan penggantian riwayat dan bahasa yang dipilih. Tautan langsung ke konten, dek, Library, dan halaman Study lainnya tetap menuju tujuan semula. Resolusi tertunda dibatalkan saat halaman diganti, operasi dibatalkan, atau penyedia dilepas; perubahan pendaftaran dan penyedia memicu resolusi baru. Penolakan akses diteruskan, pembatalan router dihormati, dan direktori bahasa tidak ditampilkan selama menunggu.

Target tutorial `modules` yang hanya digunakan direktori lama dihapus. Panduan eksternal harus menargetkan navigasi saat ini atau kontennya sendiri, bukan direktori yang telah dihapus.

## Komit

- [cc25a6568920324c31a1812c02e3790c7d12e791](https://github.com/Cognis-Labs-HQ/Cognis/commit/cc25a6568920324c31a1812c02e3790c7d12e791)
- [2de2715bf0f046d950eed9f294e3dfd6f815f043](https://github.com/Cognis-Labs-HQ/Cognis/commit/2de2715bf0f046d950eed9f294e3dfd6f815f043)
- [bf407ef2b0a68e6bdaa05c3e8ace44f544cb0488](https://github.com/Cognis-Labs-HQ/Cognis/commit/bf407ef2b0a68e6bdaa05c3e8ace44f544cb0488)
- [aea21af67ac61ff988b27fd636091a77a5998c5c](https://github.com/Cognis-Labs-HQ/Cognis/commit/aea21af67ac61ff988b27fd636091a77a5998c5c)
