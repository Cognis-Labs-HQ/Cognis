# Keandalan Uji Pencarian

**Cabang Fitur:** feature-search-completion-observation

## Periksa penutupan pencarian yang selesai

Pengujian pemilihan pencarian kini menunggu hingga lapisan pencarian dihapus dalam batas waktu tertentu, bukan menganggap pemilihan asinkron dan animasi penutupan selesai setelah jeda tetap. Pengujian tetap memeriksa jumlah pemanggilan, nilai yang dipilih, kepemilikan pembatalan, dan tujuan navigasi. Penyelesaian yang tertunda tetap berhasil, sedangkan jendela pencarian yang tetap terbuka membuat pemeriksaan penghapusan gagal.

## Komit

- [b6b3bec4110a097884ca1edd5302c63761ad222a](https://github.com/Cognis-Labs-HQ/Cognis/commit/b6b3bec4110a097884ca1edd5302c63761ad222a)
