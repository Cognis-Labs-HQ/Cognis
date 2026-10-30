# Koordinasi Email SMTP TFA

**Cabang Fitur:** feature-fix-tfa-email-heading

## Kode email TFA memakai subjek netral

Pesan SMTP yang hanya membawa kode autentikasi dua faktor kini memakai subjek kode verifikasi yang netral, bukan judul verifikasi alamat email. Pesan verifikasi alamat email yang menyertakan tautan verifikasi tetap memakai subjek verifikasi email yang sudah ada.

## Verifikasi email mengikuti panjang kode SMTP TFA

Kode konfirmasi alamat email kini memakai pengaturan panjang kode SMTP bersama, sehingga administrator dapat mengatur satu panjang kode verifikasi SMTP dari adapter notifikasi SMTP ataupun adapter SMTP TFA. Mengaktifkan SMTP TFA kini mengaktifkan pengirim notifikasi SMTP saat diperlukan, sementara SMTP TFA tetap dapat dinonaktifkan secara terpisah dan tidak tersedia ketika adapter notifikasi SMTP tidak dapat mengirim email.

## Komit

- [d164f42](https://github.com/Cognis-Labs-HQ/Cognis/commit/d164f428bb4f843efe7a875c172855182e7a4548)
