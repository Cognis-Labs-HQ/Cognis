# Batasi Akses Berbagi

**Cabang Fitur:** feature-share-credential-scope

## Batas Akun dan Tamu

Pemeriksaan akun biasa hanya menerima kredensial sesi terverifikasi. Penangan sumber daya yang mendukung tamu memeriksa izin Share saat ini secara eksplisit, lalu menerapkan izin sumber daya dan tindakan. Acara Kalender bersama, obrolan terdelegasi, Keyring tamu, dan Flashcards hanya-baca tetap memiliki akses terbatas.

## Identitas Sesi Terverifikasi

Alur peramban Auth dan Share mengelompokkan kredensial terverifikasi, bukan awalan nama akun atau penanda penyimpanan. Aktivitas belajar pribadi, ketersediaan Profil, dan pengiriman luring mendukung akun sah berawalan khusus sambil mempertahankan pembatasan tamu. Hasil autentikasi yang terlambat tidak dapat mengganti sesi lebih baru.

## Komit

- [d4ce81f358beccf5b559295be48b4f0ee0cc2408](https://github.com/Cognis-Labs-HQ/Cognis/commit/d4ce81f358beccf5b559295be48b4f0ee0cc2408)
- [1a2d25e7dc0ef6f19225f5e6cd5ccc65fcb74897](https://github.com/Cognis-Labs-HQ/Cognis/commit/1a2d25e7dc0ef6f19225f5e6cd5ccc65fcb74897)
- [0deea1701af7b4b1ca9da660a6ab299200125d0c](https://github.com/Cognis-Labs-HQ/Cognis/commit/0deea1701af7b4b1ca9da660a6ab299200125d0c)
