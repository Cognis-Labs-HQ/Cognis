# Pembersihan Pembukaan Dialog

**Cabang Fitur:** feature-popup-opening-integrated638

## Dialog gagal melepaskan halaman

Galat sinkron saat penyiapan awal dialog kini menghapus dialog yang gagal dan melepaskan fokus, pendengar peristiwa, timer, pelacak perubahan, serta hak penguncian gulir sebelum mengembalikan galat aslinya. Konfirmasi buang perubahan yang tertunda dibatalkan bersama pemiliknya yang gagal. Pratinjau Gambar memakai pembersihan bersama yang sama tanpa menyembunyikan galat terjemahan.

## Interaksi yang ada tetap berlaku

Dialog induk aktif dan pembukaan yang lebih baru mempertahankan kepemilikannya. Penutupan atau pembatalan ulang dari callback mempertahankan hasil yang sudah final. Animasi normal, dialog wajib, callback tindakan, konfirmasi perubahan, pergantian halaman, serta target, kontrol, dan pemutaran ulang tutorial mempertahankan kontraknya. Inisialisasi tetap sinkron; promise yang dikembalikan tidak ditunggu. UI bersama tidak memiliki versi paket tersendiri.

## Komit

- [32b3a5fecdcc8c0b2ed2cf7c607cd177746a66c3](https://github.com/Cognis-Labs-HQ/Cognis/commit/32b3a5fecdcc8c0b2ed2cf7c607cd177746a66c3)
- [3b5ec776fac905863f95d166fe0eb9d91a0414db](https://github.com/Cognis-Labs-HQ/Cognis/commit/3b5ec776fac905863f95d166fe0eb9d91a0414db)
