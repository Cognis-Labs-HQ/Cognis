# Penggunaan

Prosedur praktis untuk Kelas.

## Prasyarat

Masuk; pengajaran dan keanggotaan mengikuti kebijakan Study.

## Contoh

Pilih kelas, ajukan keanggotaan, dan tunggu keputusan; pengajar meninjau permintaan melalui kontrol kelas.

Pengajar mengelola kelas melalui `/classes`; pelajar yang masuk melihat keanggotaan melalui `/my-classes`. `GET /api/v1/study/classes?language=ja` mengembalikan kelas pengajar yang sesuai, sedangkan `GET /api/v1/study/my-classes` mengembalikan kelas yang diikuti pelajar.

## Hasil yang Diharapkan

Keanggotaan disetujui memberikan akses belajar kelas yang diizinkan.

## Pemecahan Masalah

Periksa kelayakan pengajar, kapasitas kelas, dan status permintaan sebelum mengulang.
