# Unggahan Profil Lebih Besar

**Feature Branch:** feature-fix-large-file-upload-failure

## Media profil mengikuti kuota penyimpanan

Unggahan avatar dan banner tidak lagi memiliki batas ukuran terpisah per berkas. Gambar besar dan banner GIF animasi dapat disimpan selama unggahan tetap berada dalam kuota penyimpanan namespace profil dan kuota global pengguna.

## Unggahan kini melewati proksi web

Konfigurasi nginx bawaan tidak lagi menolak isi permintaan API berukuran besar sebelum Cognis dapat menerapkan kuota penyimpanan pengguna. Unggahan banner juga mempertahankan posisi potong saat menyimpan preferensi tata letak.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/da55ed2007f45ede24247703d8862de139091ca9
