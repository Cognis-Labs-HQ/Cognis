# Penggunaan

Buat atau perbarui paket dokumentasi dan periksa susunan wajibnya sebelum mengirim perubahan.

## Prasyarat

Tentukan komponen pemilik atau topik inti dan verifikasi tindakan yang didukung pada implementasinya. Siapkan empat bahasa: `en`, `de`, `id`, dan `ja`.

## Contoh

Salin tiga templat peran untuk setiap bahasa dari `.github/documentation/` ke direktori `docs/` milik komponen. Untuk topik inti, gunakan direktori topik di bawah `src/docs/` dan ubah nama setiap templat README menjadi INFO. Pertahankan nama dasar huruf besar serta sufiks bahasa. Ganti semua petunjuk dengan informasi akurat; pertahankan judul persis dari [matriks susunan](/docs/standard/technical).

Deklarasikan jalur README, USAGE, dan TECHNICAL bahasa Inggris dalam manifes komponen. Topik inti ditemukan berdasarkan direktori dan tidak memerlukan manifes tersendiri. Jalankan perintah berikut dari akar repositori:

```sh
npm run check:docs
node --experimental-vm-modules --import tsx --test src/tooling/tests/documentation/*.test.js
```

## Hasil yang Diharapkan

Perintah dokumentasi melaporkan `Component documentation bundles and requested branch comparison are valid.` Pengujian memeriksa seluruh paket yang dikirim dan menolak susunan yang diubah. Matriks judul standar terlokalisasi wajib cocok dengan skema validasi.

## Pemecahan Masalah

Untuk `Required H2 order`, pulihkan judul dan urutan yang tepat sesuai peran serta bahasa. Untuk `Empty section` atau `Missing introductory paragraph`, tulis teks spesifik komponen yang terlihat; komentar tidak dihitung sebagai isi. Tutup pagar kode dengan karakter yang sama dan panjang yang cukup. Pindahkan kode dan spesifikasi endpoint dari Info. Jika pemeriksaan tautan gagal, perbaiki sumber atau tujuannya tanpa menghapus referensi yang berguna.
