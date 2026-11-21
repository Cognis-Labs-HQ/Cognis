# Masa Aktif Menu Tindakan

**Cabang Fitur:** feature-hamburger-lifetime641

## Ikat Menu pada Halamannya

Menu tindakan tertunda dan terbuka ditutup saat halaman dibatalkan, tombol pembuka dihapus, atau menu lebih baru menggantikannya. Kontrol lama tidak dapat mengembalikan tindakan. Pengguna dan Modul meneruskan masa aktif halaman saat ini tanpa mengubah tindakan berikutnya.

## Pilih Tindakan dengan Keyboard

Menu memfokuskan tindakan aktif pertama dan mendukung tombol panah, Home, End, Escape, serta Tab. Escape mengembalikan fokus ke tombol pembuka saat ini; penutupan dengan penunjuk di luar menu mempertahankan fokus baru. Kontrak bersama menu mengambang dan permukaan sementara mempertahankan reservasi tutorial untuk pemanggil dalam bundel maupun yang disajikan langsung.

## Pertahankan Fokus Dialog pada Pemiliknya

Menu tertunda juga dibatalkan saat fokus berpindah, sehingga persiapan yang terlambat tidak merebut fokus kembali. Menu di dalam dialog memakai delegasi kepemilikan fokus yang sudah ada: navigasi dan Escape membiarkan induknya terbuka, perpindahan ke kontrol dialog lain mempertahankan fokus tersebut, dan dialog bersarang baru atau penutupan induk menutup menu.

## Komit

- [f56c092cb8286c5420faccc7f943f24d4a20a2ab](https://github.com/Cognis-Labs-HQ/Cognis/commit/f56c092cb8286c5420faccc7f943f24d4a20a2ab)
- [f5535c3f93e2e101b4ae7fb399e1f81fabe9b1da](https://github.com/Cognis-Labs-HQ/Cognis/commit/f5535c3f93e2e101b4ae7fb399e1f81fabe9b1da)
