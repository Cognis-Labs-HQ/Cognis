# Masa Aktif Pilihan Karusel

**Cabang Fitur:** feature-carousel-lifetime-integrated639

## Pertahankan pilihan yang berakhir

Aktivasi karusel yang tertunda tidak lagi mengubah pengenal item, label, pilihan, status aksesibilitas, atau penghitung setelah pemilik membatalkan sinyal. Callback yang berakhir tidak dapat memberi tahu pemilik lama atau menimpa pilihan dari pemasangan baru pada elemen akar yang sama.

## Pertahankan tindakan karusel

Aktivasi sinkron dan asinkron yang masih aktif, penolakan melalui hasil false, urutan dan penggabungan pilihan dengan pengenal yang sama, Tambah, serta pembersihan pratinjau tetap berfungsi seperti sebelumnya. Target dan alur tutorial pembuatan tetap sama. Pekerjaan di dalam callback pemilik tidak dibatalkan atau dikembalikan; UI bersama tidak memiliki versi komponen terpisah.

## Komit

- [2f8afd8a8370dcf266dc52872a9a2be71dacd476](https://github.com/Cognis-Labs-HQ/Cognis/commit/2f8afd8a8370dcf266dc52872a9a2be71dacd476)
