# Masa Aktif Pilihan Karusel

**Cabang Fitur:** feature-carousel-lifetime-integrated639

## Pertahankan pilihan yang berakhir

Aktivasi karusel yang tertunda tidak lagi mengubah pengenal item, label, pilihan, status aksesibilitas, atau penghitung setelah pemilik membatalkan sinyal. Callback yang berakhir tidak dapat memberi tahu pemilik lama atau menimpa pilihan dari pemasangan baru pada elemen akar yang sama.

## Pertahankan tindakan karusel

Aktivasi sinkron dan asinkron yang masih aktif, penolakan melalui hasil false, urutan dan penggabungan pilihan dengan pengenal yang sama, Tambah, serta pembersihan pratinjau tetap berfungsi seperti sebelumnya. Target dan alur tutorial pembuatan tetap sama. Pekerjaan di dalam callback pemilik tidak dibatalkan atau dikembalikan; UI bersama tidak memiliki versi komponen terpisah.

## Komit

- [3e8affbdb84f7248cb1ff4b8fb94579325b147e4](https://github.com/Cognis-Labs-HQ/Cognis/commit/3e8affbdb84f7248cb1ff4b8fb94579325b147e4)
- [1a51f703a335861ec0a0769af89c9392cd407183](https://github.com/Cognis-Labs-HQ/Cognis/commit/1a51f703a335861ec0a0769af89c9392cd407183)
