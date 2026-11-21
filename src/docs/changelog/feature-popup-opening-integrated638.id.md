# Pembersihan Pembukaan Dialog

**Cabang Fitur:** feature-popup-opening-integrated638

## Dialog gagal melepaskan halaman

Galat sinkron saat penyiapan awal dialog kini menghapus dialog yang gagal dan melepaskan fokus, pendengar peristiwa, timer, pelacak perubahan, serta hak penguncian gulir sebelum mengembalikan galat aslinya. Konfirmasi buang perubahan yang tertunda dibatalkan bersama pemiliknya yang gagal. Pratinjau Gambar memakai pembersihan bersama yang sama tanpa menyembunyikan galat terjemahan.

## Interaksi yang ada tetap berlaku

Dialog induk aktif dan pembukaan yang lebih baru mempertahankan kepemilikannya. Penutupan atau pembatalan ulang dari callback mempertahankan hasil yang sudah final. Animasi normal, dialog wajib, callback tindakan, konfirmasi perubahan, pergantian halaman, serta target, kontrol, dan pemutaran ulang tutorial mempertahankan kontraknya. Inisialisasi tetap sinkron; promise yang dikembalikan tidak ditunggu. UI bersama tidak memiliki versi paket tersendiri.

## Komit

- [bc19cea34dc3a2c52b07ac47ed49d2fdfb8b5301](https://github.com/Cognis-Labs-HQ/Cognis/commit/bc19cea34dc3a2c52b07ac47ed49d2fdfb8b5301)
- [3e9a85d44408718a08618b285cd0e802184d5841](https://github.com/Cognis-Labs-HQ/Cognis/commit/3e9a85d44408718a08618b285cd0e802184d5841)
