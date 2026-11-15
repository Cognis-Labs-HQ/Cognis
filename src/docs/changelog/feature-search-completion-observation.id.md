# Keandalan Uji Pencarian

**Cabang Fitur:** feature-search-completion-observation

## Periksa penutupan pencarian yang selesai

Pengujian pemilihan pencarian kini menunggu hingga lapisan pencarian dihapus dalam batas waktu tertentu, bukan menganggap pemilihan asinkron dan animasi penutupan selesai setelah jeda tetap. Pengujian tetap memeriksa jumlah pemanggilan, nilai yang dipilih, kepemilikan pembatalan, dan tujuan navigasi. Penyelesaian yang tertunda tetap berhasil, sedangkan jendela pencarian yang tetap terbuka membuat pemeriksaan penghapusan gagal.

## Komit

- [Tunggu penghapusan lapisan pencarian dalam pengujian penyelesaian](https://github.com/Cognis-Labs-HQ/Cognis/commit/def5d8af2582d609a5529c43240bb47cdcf497ab)
