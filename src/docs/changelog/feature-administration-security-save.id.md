# Penyimpanan Administrasi

**Cabang Fitur:** feature-administration-security-save

## Penyimpanan Administrasi

Administrasi hanya menyimpan bagian dengan perubahan tertunda. Kontrol keamanan dapat diedit setelah pengaturan keamanan dan kebijakan kata sandi berhasil dimuat. Penggambaran ulang formulir mempertahankan perubahan; meninggalkan bagian yang diubah tetap memerlukan konfirmasi pembuangan. Penyimpanan yang berhasil sebagian mempertahankan perubahan yang gagal atau lebih baru, sehingga percobaan ulang tidak mengirim ulang pengaturan yang sudah tersimpan. Panduan Keamanan tetap menjelaskan kebijakan sesi dan domain tepercaya.

## Pemulihan Terjemahan

Pemulihan koneksi membatalkan cache terjemahan inti dan komponen sebelum halaman digambar ulang. Permintaan pembaruan mengambil konten server terbaru sambil mempertahankan salinan luring lengkap saat terjadi gangguan. Respons XML yang tidak valid tidak disimpan sehingga pemuatan berikutnya dapat pulih tanpa pemuatan ulang penuh.

## Verifikasi Email Awal

`tfa:getLoginMethods(accountId)` menyiapkan tantangan hanya saat satu metode tersedia tanpa kode pemulihan yang belum digunakan. Jika tidak, UI login meminta tantangan melalui `POST /api/v1/tfa/login/resend` untuk metode awal dengan `challengeOnSelect` dan pilihan berikutnya yang belum memiliki tantangan. Tantangan dari server digunakan kembali. Kegagalan pengiriman ditampilkan dalam bahasa pengguna; log mencatat metode, akun, kesiapan, dan alasan kegagalan tanpa kode atau isi email.

## Diagnostik Terpusat

Logging terpusat kini mengendalikan pengiriman ke server dan keluaran konsol peramban untuk diagnostik terjemahan, TFA, dan worker luring. Otorisasi gateway dan tingkat keparahan menentukan keluaran peramban; metadata tidak menyertakan kredensial atau pesan galat mentah.

## Komit

- [996af37783915d3246df5c1fc1044b01c4f46fa1](https://github.com/Cognis-Labs-HQ/Cognis/commit/996af37783915d3246df5c1fc1044b01c4f46fa1)
- [bce901458c323767adc2321ac3b5d1a1146c95c7](https://github.com/Cognis-Labs-HQ/Cognis/commit/bce901458c323767adc2321ac3b5d1a1146c95c7)
- [947677579880703dff73f7acdfd27c9ee3ef02cb](https://github.com/Cognis-Labs-HQ/Cognis/commit/947677579880703dff73f7acdfd27c9ee3ef02cb)
- [18709e6e484e6c7bf6ddb333d06ffdebdb3b71fa](https://github.com/Cognis-Labs-HQ/Cognis/commit/18709e6e484e6c7bf6ddb333d06ffdebdb3b71fa)
- [fa239f1b4e9dc5f0ca34c10e6ada95b95014a227](https://github.com/Cognis-Labs-HQ/Cognis/commit/fa239f1b4e9dc5f0ca34c10e6ada95b95014a227)
- [57fe89b2259021a0e015d76a950bd35f64376184](https://github.com/Cognis-Labs-HQ/Cognis/commit/57fe89b2259021a0e015d76a950bd35f64376184)
