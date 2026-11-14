# Batasi Akses Berbagi

**Cabang Fitur:** feature-share-credential-scope

## Batas Akun dan Tamu

Pemeriksaan akun biasa hanya menerima kredensial sesi terverifikasi. Penangan sumber daya yang mendukung tamu memeriksa izin Share saat ini secara eksplisit, lalu menerapkan izin sumber daya dan tindakan. Acara Kalender bersama, obrolan terdelegasi, Keyring tamu, dan Flashcards hanya-baca tetap memiliki akses terbatas.

## Identitas Sesi Terverifikasi

Alur peramban Auth dan Share mengelompokkan kredensial terverifikasi, bukan awalan nama akun atau penanda penyimpanan. Aktivitas belajar pribadi, ketersediaan Profil, dan pengiriman luring mendukung akun sah berawalan khusus sambil mempertahankan pembatasan tamu. Hasil autentikasi yang terlambat tidak dapat mengganti sesi lebih baru.

## Komit

- https://github.com/Cognis-Labs-HQ/Cognis/commit/2a5c1863cf64383bcacfcee1dabe157ad0321b21
