# Pendaftaran Terbatas

**Cabang Fitur:** feature-onboarding-credential-scope

## Onboarding Terbatas

Pendaftaran memakai otoritas Auth berbatas waktu untuk operasi akun sendiri yang dideklarasikan, bukan sesi biasa. Notify tetap terbatas pada akun baru; login normal tetap menegakkan TFA.

## Penyelesaian Eksplisit

Penyelesaian, pembatalan, dan login normal mencabut otoritas onboarding. Kegagalan masa berlaku dan penyimpanan menolak akses selanjutnya; efek eksternal yang selesai tidak dapat dibatalkan secara atomik.

## Migrasi Ekstensi

Ekstensi penyelesaian memakai operasi yang dideklarasikan. Koordinasikan rilis dengan Terms of Service 1.6.13 dan pertahankan persetujuan nyata serta pemeriksaan versi dokumen.

Pendaftaran menolak pengiriman jika penangan penyelesaian, deklarasi, atau kolom formulir wajib tidak tersedia. Deklarasi operasi disimpan sebelum panggilan ekstensi, dan meninggalkan verifikasi menutup popup serta mencabut kredensial.

## Komit

- [2ca3f67183c56d0f93b9352c81e1ed9c4778b87b](https://github.com/Cognis-Labs-HQ/Cognis/commit/2ca3f67183c56d0f93b9352c81e1ed9c4778b87b)
