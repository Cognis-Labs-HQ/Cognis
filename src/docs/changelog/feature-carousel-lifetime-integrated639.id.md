# Masa Aktif Pilihan Karusel

**Cabang Fitur:** feature-carousel-lifetime-integrated639

## Pertahankan pilihan yang berakhir

Aktivasi karusel yang tertunda tidak lagi mengubah pengenal item, label, pilihan, status aksesibilitas, atau penghitung setelah pemilik membatalkan sinyal. Callback yang berakhir tidak dapat memberi tahu pemilik lama atau menimpa pilihan dari pemasangan baru pada elemen akar yang sama.

## Pertahankan tindakan karusel

Aktivasi sinkron dan asinkron yang masih aktif, penolakan melalui hasil false, urutan dan penggabungan pilihan dengan pengenal yang sama, Tambah, serta pembersihan pratinjau tetap berfungsi seperti sebelumnya. Target dan alur tutorial pembuatan tetap sama. Pekerjaan di dalam callback pemilik tidak dibatalkan atau dikembalikan; UI bersama tidak memiliki versi komponen terpisah.

## Komit

- [0ff5956143b85559849d3d58491d4e7b14702880](https://github.com/Cognis-Labs-HQ/Cognis/commit/0ff5956143b85559849d3d58491d4e7b14702880)
- [4aa50d65b56dc2ecf4d271516b9a8719bd2519f0](https://github.com/Cognis-Labs-HQ/Cognis/commit/4aa50d65b56dc2ecf4d271516b9a8719bd2519f0)
