# Perbaikan Latihan Menulis

**Cabang Fitur:** feature-update-external-package-contract-definitions

## Izinkan bacaan yang belum diketahui

Skema satuan tulisan tetap memakai tipe standar pelafalan dan audio, tetapi penyedia dapat menjadikan nilai pelafalan opsional. Paket bahasa Jepang kini dapat diaktifkan tanpa mengarang bacaan. Nilai wajib dan tipe yang salah tetap divalidasi.

## Ukuran panel gambar konsisten

Panel gambar mengambang dibuka dalam bingkai besar yang tidak bergantung pada rasio aspek kata atau pola. Pergantian kartu mempertahankan posisi dan ukuran yang disesuaikan pengguna; proporsi gambar tetap terjaga.

## Panduan goresan yang konsisten

Sebelum masukan pertama, pola yang belum pernah diselesaikan menampilkan seluruh goresan. Setelah masukan dimulai, hanya goresan berikutnya yang dipandu, termasuk saat berpindah karakter. Pola yang pernah diselesaikan langsung memakai panduan goresan berikutnya, dengan pengujian goresan tersembunyi dan tombol pengungkap tetap tersedia.

## Simpan kemajuan menggambar

Status penyelesaian dan jumlah goresan yang disembunyikan disimpan per akun dan kartu melalui penyimpanan preferensi. Setiap percobaan, pengaturan ulang, dan pengulangan memilih posisi acak berbeda berdasarkan jumlah tersebut. Penyelesaian dengan paling banyak satu kesalahan menambah jumlahnya satu, dibatasi jumlah goresan pola saat ini. Pola yang pernah diselesaikan tetap memandu goresan berikutnya, sedangkan pola yang belum selesai menampilkan seluruh pola sebelum masukan. Permintaan GET dan POST terautentikasi ke `/api/v1/study/drawing/:cardId` menjalankan alur `study:drawing:readProgress` dan `study:drawing:complete`; peramban tidak mengirim identitas akun.

## Komit

- [7c13999](https://github.com/Cognis-Labs-HQ/Cognis/commit/7c139996e214333425b23342aae45de133d2bbab)
- [a36941c](https://github.com/Cognis-Labs-HQ/Cognis/commit/a36941c258afaa3b6c528fabfb80b8c3a1fc211d)
