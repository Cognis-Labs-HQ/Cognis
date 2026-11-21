# Masa Aktif Menu Tindakan

**Cabang Fitur:** feature-hamburger-lifetime641

## Ikat Menu pada Halamannya

Menu tindakan tertunda dan terbuka ditutup saat halaman dibatalkan, tombol pembuka dihapus, atau menu lebih baru menggantikannya. Kontrol lama tidak dapat mengembalikan tindakan. Pengguna dan Modul meneruskan masa aktif halaman saat ini tanpa mengubah tindakan berikutnya.

## Pilih Tindakan dengan Keyboard

Menu memfokuskan tindakan aktif pertama dan mendukung tombol panah, Home, End, Escape, serta Tab. Escape mengembalikan fokus ke tombol pembuka saat ini; penutupan dengan penunjuk di luar menu mempertahankan fokus baru. Kontrak bersama menu mengambang dan permukaan sementara mempertahankan reservasi tutorial untuk pemanggil dalam bundel maupun yang disajikan langsung.

## Pertahankan Fokus Dialog pada Pemiliknya

Menu tertunda juga dibatalkan saat fokus berpindah, sehingga persiapan yang terlambat tidak merebut fokus kembali. Menu di dalam dialog memakai delegasi kepemilikan fokus yang sudah ada: navigasi dan Escape membiarkan induknya terbuka, perpindahan ke kontrol dialog lain mempertahankan fokus tersebut, dan dialog bersarang baru atau penutupan induk menutup menu.

## Komit

- [731807501377b0b3e868c97bb2334d5da4b43ee8](https://github.com/Cognis-Labs-HQ/Cognis/commit/731807501377b0b3e868c97bb2334d5da4b43ee8)
- [1f6984009dd260f08ab607f247202b90a4807ef2](https://github.com/Cognis-Labs-HQ/Cognis/commit/1f6984009dd260f08ab607f247202b90a4807ef2)
