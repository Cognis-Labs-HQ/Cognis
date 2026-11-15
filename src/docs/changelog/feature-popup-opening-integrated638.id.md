# Pembersihan Pembukaan Dialog

**Cabang Fitur:** feature-popup-opening-integrated638

## Dialog gagal melepaskan halaman

Galat sinkron saat penyiapan awal dialog kini menghapus dialog yang gagal dan melepaskan fokus, pendengar peristiwa, timer, pelacak perubahan, serta hak penguncian gulir sebelum mengembalikan galat aslinya. Konfirmasi buang perubahan yang tertunda dibatalkan bersama pemiliknya yang gagal. Pratinjau Gambar memakai pembersihan bersama yang sama tanpa menyembunyikan galat terjemahan.

## Interaksi yang ada tetap berlaku

Dialog induk aktif dan pembukaan yang lebih baru mempertahankan kepemilikannya. Penutupan atau pembatalan ulang dari callback mempertahankan hasil yang sudah final. Animasi normal, dialog wajib, callback tindakan, konfirmasi perubahan, pergantian halaman, serta target, kontrol, dan pemutaran ulang tutorial mempertahankan kontraknya. Inisialisasi tetap sinkron; promise yang dikembalikan tidak ditunggu. UI bersama tidak memiliki versi paket tersendiri.

## Komit

- [d3cde8f4eb18f2b646fe2fdd9128513db9d5365d](https://github.com/Cognis-Labs-HQ/Cognis/commit/d3cde8f4eb18f2b646fe2fdd9128513db9d5365d)
- [c6f12076f510b9853f0a9a63a1777f4a1138cd48](https://github.com/Cognis-Labs-HQ/Cognis/commit/c6f12076f510b9853f0a9a63a1777f4a1138cd48)
- [31ad1f9de89eb8a9daf6afd13dbeec42b6cee9fc](https://github.com/Cognis-Labs-HQ/Cognis/commit/31ad1f9de89eb8a9daf6afd13dbeec42b6cee9fc)
