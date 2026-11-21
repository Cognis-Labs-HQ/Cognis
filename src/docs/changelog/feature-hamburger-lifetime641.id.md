# Masa Aktif Menu Tindakan

**Cabang Fitur:** feature-hamburger-lifetime641

## Ikat Menu pada Halamannya

Menu tindakan tertunda dan terbuka ditutup saat halaman dibatalkan, tombol pembuka dihapus, atau menu lebih baru menggantikannya. Kontrol lama tidak dapat mengembalikan tindakan. Pengguna dan Modul meneruskan masa aktif halaman saat ini tanpa mengubah tindakan berikutnya.

## Pilih Tindakan dengan Keyboard

Menu memfokuskan tindakan aktif pertama dan mendukung tombol panah, Home, End, Escape, serta Tab. Escape mengembalikan fokus ke tombol pembuka saat ini; penutupan dengan penunjuk di luar menu mempertahankan fokus baru. Kontrak bersama menu mengambang dan permukaan sementara mempertahankan reservasi tutorial untuk pemanggil dalam bundel maupun yang disajikan langsung.

## Pertahankan Fokus Dialog pada Pemiliknya

Menu tertunda juga dibatalkan saat fokus berpindah, sehingga persiapan yang terlambat tidak merebut fokus kembali. Menu di dalam dialog memakai delegasi kepemilikan fokus yang sudah ada: navigasi dan Escape membiarkan induknya terbuka, perpindahan ke kontrol dialog lain mempertahankan fokus tersebut, dan dialog bersarang baru atau penutupan induk menutup menu.

## Komit

- [d437ae0479f6a2ecc6ca83926275b4779014fdf3](https://github.com/Cognis-Labs-HQ/Cognis/commit/d437ae0479f6a2ecc6ca83926275b4779014fdf3)
- [d3d62fbdd0397e2a982bf1e05cdd1b0126d45597](https://github.com/Cognis-Labs-HQ/Cognis/commit/d3d62fbdd0397e2a982bf1e05cdd1b0126d45597)
