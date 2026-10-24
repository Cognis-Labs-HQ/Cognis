# Gaya Pesan yang Andal

**Cabang Fitur:** feature-fix-test-failures-from-last-pr

## Pulihkan semua gaya pesan

Halaman Pesan kembali memuat semua stylesheet milik adaptor saat dikunjungi langsung, sesuai dengan gaya yang didaftarkan untuk navigasi sisi klien.

## Pertahankan gaya pemuatan langsung tanpa pengujian rapuh

Seperti halaman Profil dan Kelas, Pesan memiliki kerangka HTML mandiri untuk kunjungan langsung. Karena itu, tautan eksplisit yang sesuai dengan gaya rute SPA tetap dipertahankan. Pengujian khusus fitur kini berfokus pada perilaku tampilan, bukan menuntut mekanisme pemuatan tertentu.

## Komit

- [1406a2d](https://github.com/Cognis-Labs-HQ/Cognis/commit/1406a2d7a8e98cca18214cfeeb104b3a5054c876)
- [48522be](https://github.com/Cognis-Labs-HQ/Cognis/commit/48522be12b3e38476cf4622d9eecf466bc74e6b1)
