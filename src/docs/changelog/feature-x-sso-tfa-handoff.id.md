# Lanjutkan Verifikasi SSO

**Cabang Fitur:** feature-x-sso-tfa-handoff

## Lanjutkan Tantangan Yang Ada

Akun SSO dengan TFA kembali ke formulir login biasa untuk memverifikasi tantangan yang sudah diterbitkan. Coba Lagi dan Batal menangani login terputus tanpa membuat sesi atau mengirim email ulang. Auth 2.2.10 menyediakan kelanjutan HttpOnly singkat; X SSO 1.0.63 memakai penanda halaman login yang eksplisit.

## Lindungi Percobaan Tertunda

Kedaluwarsa, verifikasi atomik, pembatalan, penggantian dan logout menonaktifkan percobaan server yang sesuai. Tab lama tidak dapat membatalkan percobaan baru atau menimpa cookie-nya. Pekerjaan browser tertunda dibatasi pada formulir aktif.

## Komit

- [0e14cb64c42f3c5ae96710fdd1ae404db6875aed](https://github.com/Cognis-Labs-HQ/Cognis/commit/0e14cb64c42f3c5ae96710fdd1ae404db6875aed)
