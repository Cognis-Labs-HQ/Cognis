# Adapter TFA SMTP

## Ringkasan

Adapter TFA SMTP menambahkan faktor kedua berbasis kode email ke gateway TFA. Saat penyiapan dan login, adapter ini mengirim kode sekali pakai ke email utama pengguna dengan memanfaatkan alur email verifikasi dari gateway Notification.

## Persyaratan

- Gateway Notification harus menyediakan pengiriman email verifikasi.
- Pengirim SMTP harus dikonfigurasi dan diaktifkan di administrasi gateway Notification.
- Akun pengguna harus memiliki email utama yang sudah terverifikasi.

## Konfigurasi

- `codeLength` (angka, opsional): Panjang kode numerik yang dihasilkan. Nilai dibatasi ke rentang 4–10 digit.
