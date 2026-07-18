# Koordinasi Email SMTP TFA

## Kode email TFA memakai subjek netral

Pesan SMTP yang hanya membawa kode autentikasi dua faktor kini memakai subjek kode verifikasi yang netral, bukan judul verifikasi alamat email. Pesan verifikasi alamat email yang menyertakan tautan verifikasi tetap memakai subjek verifikasi email yang sudah ada.

## Verifikasi email mengikuti panjang kode SMTP TFA

Kode konfirmasi alamat email kini memakai panjang kode yang dikonfigurasi pada adapter SMTP TFA, sehingga administrator mengatur satu panjang bersama untuk kode verifikasi SMTP. Pengirim notifikasi SMTP dan adapter SMTP TFA juga menyinkronkan status aktif/nonaktifnya di kedua arah.
