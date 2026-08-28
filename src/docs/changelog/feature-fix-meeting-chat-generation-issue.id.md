# Obrolan Rapat Andal

**Feature Branch:** feature-fix-meeting-chat-generation-issue

## Hubungkan kembali rapat

Rapat yang digunakan kembali kini menyimpan ruang obrolan yang baru ditentukan sehingga peserta tidak lagi meminta ruang yang telah dihapus dan menerima respons tidak ditemukan.

## Peserta LDAP dapat bergabung

Pencarian peserta rapat tetap mensyaratkan hubungan mengikuti dan mengecualikan pengguna saat ini. Undangan dikirimkan ke akun terautentikasi penerima, dan peserta yang disediakan melalui LDAP tetap diizinkan melalui identitas akun stabil ketika nama pengguna yang terlihat berubah.

## Commits

- [f4538f6](https://github.com/Cognis-Labs-HQ/Cognis/commit/f4538f6775857d81af67d624d800e27ee8b09548)
