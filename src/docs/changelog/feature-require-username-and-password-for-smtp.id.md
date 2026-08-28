# Pengaturan Auth SMTP

**Feature Branch:** feature-require-username-and-password-for-smtp

## Mewajibkan kredensial SMTP kecuali autentikasi dinonaktifkan

Pengaturan adapter notifikasi SMTP kini memperlakukan nama pengguna dan kata sandi sebagai kolom wajib saat Nonaktifkan Autentikasi dimatikan, sehingga konfigurasi SMTP berautentikasi yang belum lengkap tidak disimpan melalui Administrasi.

## Menandai kolom wajib di formulir

Judul kolom wajib kini menampilkan tanda bintang dalam mode terang dan gelap. Penanda langsung diperbarui ketika perubahan formulir mengubah kolom SMTP yang wajib diisi.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/8983ae1fe74eac032b99e894abf857606af7260c
