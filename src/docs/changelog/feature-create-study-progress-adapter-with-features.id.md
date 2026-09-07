# Peristiwa Kemajuan Belajar

**Cabang Fitur:** feature-create-study-progress-adapter-with-features

## Pelacakan kemajuan tetap

Menambahkan peristiwa belajar idempoten dengan lingkup privasi, koreksi kompensasi, proyeksi penguasaan yang dapat dibangun ulang, agregasi multidimensi, dan alur ekstensi bertahap.

## Grup filter metadata berfungsi

Grup metadata Pustaka kini dapat menetapkan pil pilihan tunggal eksklusif atau mengizinkan beberapa pilihan. Pemilihan pil langsung menyembunyikan kartu yang tidak cocok, termasuk kartu yang gaya kisi tampilannya sebelumnya mengalahkan status `hidden`.

## Audio bertema dan terautentikasi

Audio Pustaka kini dimuat melalui klien gateway Study terautentikasi, bukan permintaan media asli tanpa autentikasi. URL media sementara dibersihkan setelah dipakai, dan kontrol asli mengikuti tema aplikasi terang atau gelap.

## Struktur UI Pustaka sesuai aturan

Titik masuk peramban Pustaka dipindahkan ke tata letak adaptor wajib `ui/app/index.js`, lalu rute waktu jalan dan pengujian struktur diperbarui. Pemindaian dokumentasi kini mengabaikan keluaran build, pemeriksaan nama menangani sumber yang dipindahkan, dan pengujian router mencerminkan rute gateway dinamis serta status navigasi yang dipertahankan.

## Impor konten yang dapat diulang

Paket konten Pustaka Studi kini menggunakan upsert basis data atomik untuk catatan, aset, dan referensi sehingga kunci duplikat dan impor serentak tidak lagi mengganggu aktivasi ulang modul.

## Commit

- [1d65413](https://github.com/Cognis-Labs-HQ/Cognis/commit/1d65413154f89efbd91422bbfdc94bc8196e9f16)
- [656b59f](https://github.com/Cognis-Labs-HQ/Cognis/commit/656b59feef1ff344ce911a042eecae788a228cc4)
- [e183481](https://github.com/Cognis-Labs-HQ/Cognis/commit/e18348130104134eaa7962aa3020a03a22325e86)
- [ba25e44](https://github.com/Cognis-Labs-HQ/Cognis/commit/ba25e4481d6c71a35ebe2ecc8d0143b85f0125b3)
- [ef782975](https://github.com/Cognis-Labs-HQ/Cognis/commit/ef782975)
- [68bd7478](https://github.com/Cognis-Labs-HQ/Cognis/commit/68bd7478dbf6343109087bd83a9fba643452a838)
- [eeabc5e1](https://github.com/Cognis-Labs-HQ/Cognis/commit/eeabc5e1231e3de246a14ee4ff49582a7169768c)
