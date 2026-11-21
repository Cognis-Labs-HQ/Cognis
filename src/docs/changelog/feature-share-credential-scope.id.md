# Batasi Akses Berbagi

**Cabang Fitur:** feature-share-credential-scope

## Batas Akun dan Tamu

Pemeriksaan akun biasa hanya menerima kredensial sesi terverifikasi. Penangan sumber daya yang mendukung tamu memeriksa izin Share saat ini secara eksplisit, lalu menerapkan izin sumber daya dan tindakan. Acara Kalender bersama, obrolan terdelegasi, Keyring tamu, dan Flashcards hanya-baca tetap memiliki akses terbatas.

## Identitas Sesi Terverifikasi

Alur peramban Auth dan Share mengelompokkan kredensial terverifikasi, bukan awalan nama akun atau penanda penyimpanan. Aktivitas belajar pribadi, ketersediaan Profil, dan pengiriman luring mendukung akun sah berawalan khusus sambil mempertahankan pembatasan tamu. Hasil autentikasi yang terlambat tidak dapat mengganti sesi lebih baru.

## Komit

- [7e5d3d04323e4c3109e364d39f063d650ad63629](https://github.com/Cognis-Labs-HQ/Cognis/commit/7e5d3d04323e4c3109e364d39f063d650ad63629)
- [56c4ec2f65332bf0e3b64dcf57c17fd49210df24](https://github.com/Cognis-Labs-HQ/Cognis/commit/56c4ec2f65332bf0e3b64dcf57c17fd49210df24)
