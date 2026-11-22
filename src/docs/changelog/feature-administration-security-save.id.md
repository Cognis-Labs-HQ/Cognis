# Penyimpanan Administrasi

**Cabang Fitur:** feature-administration-security-save

## Penyimpanan Administrasi

Administrasi hanya menyimpan bagian dengan perubahan tertunda. Kontrol keamanan dapat diedit setelah pengaturan keamanan dan kebijakan kata sandi berhasil dimuat. Penggambaran ulang formulir mempertahankan perubahan; meninggalkan bagian yang diubah tetap memerlukan konfirmasi pembuangan. Penyimpanan yang berhasil sebagian mempertahankan perubahan yang gagal atau lebih baru, sehingga percobaan ulang tidak mengirim ulang pengaturan yang sudah tersimpan. Panduan Keamanan tetap menjelaskan kebijakan sesi dan domain tepercaya.

## Pemulihan Terjemahan

Pemulihan koneksi memperbarui paket terjemahan yang pernah dimuat sebelum menggambar ulang halaman. Pembacaan biasa langsung memakai cache luring; XML tidak valid ditolak dan dicoba kembali dengan pembaruan.

## Verifikasi Email Awal

Tantangan email awal diminta jika metode terpilih memerlukan pengiriman. Pengiriman dan kirim ulang dibatasi 15 detik tanpa memblokir autentikator atau kode pemulihan. Permintaan tertunda tidak diduplikasi dan dibatalkan ketika formulir masuk baru dibuka.

## Diagnostik Terpusat

Logging mengendalikan pengiriman server dan tampilan peramban melalui izin gateway dan tingkat keparahan. Server dan peramban memakai satu katalog tingkat, prioritas, dan alias konsol. Metadata tidak menyertakan kredensial atau pesan kesalahan mentah. Gateway menyediakan logging melalui ctx; inti hanya menyediakan kesiapan kapabilitas umum dan pemanggilan tertunda yang dibatasi.

## Batas Logging

Pemeriksaan sumber mewajibkan logging gateway dalam aplikasi dan modul eksternal, termasuk skrip peramban dan penangan peristiwa. Ekstraksi skrip menangani spasi dan atribut tag penutup yang diterima peramban, pemisah dalam kutipan, dan skrip tanpa penutup. Laporan perintah dan build tetap memakai keluaran terminal.

## Komit

- [996af37783915d3246df5c1fc1044b01c4f46fa1](https://github.com/Cognis-Labs-HQ/Cognis/commit/996af37783915d3246df5c1fc1044b01c4f46fa1)
- [bce901458c323767adc2321ac3b5d1a1146c95c7](https://github.com/Cognis-Labs-HQ/Cognis/commit/bce901458c323767adc2321ac3b5d1a1146c95c7)
- [947677579880703dff73f7acdfd27c9ee3ef02cb](https://github.com/Cognis-Labs-HQ/Cognis/commit/947677579880703dff73f7acdfd27c9ee3ef02cb)
- [18709e6e484e6c7bf6ddb333d06ffdebdb3b71fa](https://github.com/Cognis-Labs-HQ/Cognis/commit/18709e6e484e6c7bf6ddb333d06ffdebdb3b71fa)
- [fa239f1b4e9dc5f0ca34c10e6ada95b95014a227](https://github.com/Cognis-Labs-HQ/Cognis/commit/fa239f1b4e9dc5f0ca34c10e6ada95b95014a227)
- [57fe89b2259021a0e015d76a950bd35f64376184](https://github.com/Cognis-Labs-HQ/Cognis/commit/57fe89b2259021a0e015d76a950bd35f64376184)
- [3167a5a53da2ed87485b7b9df244b7edc9bf5089](https://github.com/Cognis-Labs-HQ/Cognis/commit/3167a5a53da2ed87485b7b9df244b7edc9bf5089)
- [753f9e4893d00853626fd21392e7ce21f560353e](https://github.com/Cognis-Labs-HQ/Cognis/commit/753f9e4893d00853626fd21392e7ce21f560353e)
