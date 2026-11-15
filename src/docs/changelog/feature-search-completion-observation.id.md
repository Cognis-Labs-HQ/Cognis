# Keandalan Uji Pencarian

**Cabang Fitur:** feature-search-completion-observation

## Periksa penutupan pencarian yang selesai

Pengujian pemilihan pencarian kini menunggu hingga lapisan pencarian dihapus dalam batas waktu tertentu, bukan menganggap pemilihan asinkron dan animasi penutupan selesai setelah jeda tetap. Pengujian tetap memeriksa jumlah pemanggilan, nilai yang dipilih, kepemilikan pembatalan, dan tujuan navigasi. Penyelesaian yang tertunda tetap berhasil, sedangkan jendela pencarian yang tetap terbuka membuat pemeriksaan penghapusan gagal.

## Komit

- https://github.com/Cognis-Labs-HQ/Cognis/commit/386a5bec660d2014e932752f9efa6c09a1837fad
