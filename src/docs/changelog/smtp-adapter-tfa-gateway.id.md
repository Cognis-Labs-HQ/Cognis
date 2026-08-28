# Perbaikan TFA Gateway

**Feature Branch:** copilot/smtp-adapter-tfa-gateway

## Permintaan aktifkan tidak lagi gagal; TOTP diaktifkan secara default; status SMTP TFA mengikuti SMTP Notifikasi

Permintaan aktifkan pada TFA gateway tidak lagi gagal ketika adaptor belum dikonfigurasi secara eksplisit di database. Adaptor TOTP kini diaktifkan secara default pada instalasi baru karena tidak memiliki dependensi eksternal. Ketersediaan adaptor SMTP TFA kini terhubung ke adaptor SMTP Notifikasi: jika pengiriman SMTP tidak dikonfigurasi, autentikasi dua faktor berbasis SMTP otomatis tidak tersedia dan tombolnya terkunci di Administrasi. Mengaktifkan atau menonaktifkan adaptor TFA tidak lagi menimpa konfigurasi yang tersimpan. Panjang kode verifikasi default untuk adaptor SMTP TFA adalah enam digit.

## Commits

- [93e0a59](https://github.com/Cognis-Labs-HQ/Cognis/commit/93e0a59123d977c14b058e65dab3d9d42ebd011b)
