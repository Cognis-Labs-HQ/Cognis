# Lanjutkan Verifikasi SSO

**Cabang Fitur:** feature-x-sso-tfa-handoff

## Lanjutkan Tantangan Yang Ada

Akun SSO dengan TFA kembali ke formulir login biasa untuk memverifikasi tantangan yang sudah diterbitkan. Coba Lagi dan Batal menangani login terputus tanpa membuat sesi atau mengirim email ulang. Auth 2.2.10 menyediakan kelanjutan HttpOnly singkat; X SSO 1.0.63 memakai penanda halaman login yang eksplisit.

## Lindungi Percobaan Tertunda

Kedaluwarsa, verifikasi atomik, pembatalan, penggantian dan logout menonaktifkan percobaan server yang sesuai. Tab lama tidak dapat membatalkan percobaan baru atau menimpa cookie-nya. Pekerjaan browser tertunda dibatasi pada formulir aktif.

## Komit

- https://github.com/Cognis-Labs-HQ/Cognis/commit/6c3a7fb4a2bf3a2882d5cb801382ad503fcd74bb
