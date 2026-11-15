# Pembersihan Pembukaan Dialog

**Cabang Fitur:** feature-popup-opening-integrated638

## Dialog gagal melepaskan halaman

Galat sinkron saat penyiapan awal dialog kini menghapus dialog yang gagal dan melepaskan fokus, pendengar peristiwa, timer, pelacak perubahan, serta hak penguncian gulir sebelum mengembalikan galat aslinya. Konfirmasi buang perubahan yang tertunda dibatalkan bersama pemiliknya yang gagal. Pratinjau Gambar memakai pembersihan bersama yang sama tanpa menyembunyikan galat terjemahan.

## Interaksi yang ada tetap berlaku

Dialog induk aktif dan pembukaan yang lebih baru mempertahankan kepemilikannya. Penutupan atau pembatalan ulang dari callback mempertahankan hasil yang sudah final. Animasi normal, dialog wajib, callback tindakan, konfirmasi perubahan, pergantian halaman, serta target, kontrol, dan pemutaran ulang tutorial mempertahankan kontraknya. Inisialisasi tetap sinkron; promise yang dikembalikan tidak ditunggu. UI bersama tidak memiliki versi paket tersendiri.

## Komit

- [9333cb1accf7b3960590206134fc1394b6ca3e56](https://github.com/Cognis-Labs-HQ/Cognis/commit/9333cb1accf7b3960590206134fc1394b6ca3e56)
