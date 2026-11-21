# Penyimpanan Administrasi

**Cabang Fitur:** feature-administration-security-save

## Penyimpanan Administrasi

Administrasi hanya menyimpan bagian dengan perubahan tertunda. Kontrol keamanan dapat diedit setelah pengaturan keamanan dan kebijakan kata sandi berhasil dimuat. Penggambaran ulang formulir mempertahankan perubahan; meninggalkan bagian yang diubah tetap memerlukan konfirmasi pembuangan. Penyimpanan yang berhasil sebagian mempertahankan perubahan yang gagal atau lebih baru, sehingga percobaan ulang tidak mengirim ulang pengaturan yang sudah tersimpan. Panduan Keamanan tetap menjelaskan kebijakan sesi dan domain tepercaya.

## Pemulihan Terjemahan

Pemulihan koneksi membatalkan cache terjemahan inti dan komponen sebelum halaman digambar ulang. Permintaan pembaruan mengambil konten server terbaru sambil mempertahankan salinan luring lengkap saat terjadi gangguan. Respons XML yang tidak valid tidak disimpan sehingga pemuatan berikutnya dapat pulih tanpa pemuatan ulang penuh.

## Verifikasi Email Awal

`tfa:getLoginMethods(accountId)` menyiapkan tantangan hanya saat satu metode tersedia tanpa kode pemulihan yang belum digunakan. Jika tidak, UI login meminta tantangan melalui `POST /api/v1/tfa/login/resend` untuk metode awal dengan `challengeOnSelect` dan pilihan berikutnya yang belum memiliki tantangan. Tantangan dari server digunakan kembali. Kegagalan pengiriman ditampilkan dalam bahasa pengguna; log mencatat metode, akun, kesiapan, dan alasan kegagalan tanpa kode atau isi email.

## Komit

- [5670661ce549fca1766d385fdfcb157114365b6d](https://github.com/Cognis-Labs-HQ/Cognis/commit/5670661ce549fca1766d385fdfcb157114365b6d)
- [bce901458c323767adc2321ac3b5d1a1146c95c7](https://github.com/Cognis-Labs-HQ/Cognis/commit/bce901458c323767adc2321ac3b5d1a1146c95c7)
- [947677579880703dff73f7acdfd27c9ee3ef02cb](https://github.com/Cognis-Labs-HQ/Cognis/commit/947677579880703dff73f7acdfd27c9ee3ef02cb)
