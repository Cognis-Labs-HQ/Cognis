# Kendali Pemilihan Pencarian

**Cabang Fitur:** feature-search-selection-ownership

## Tunggu hasil pemilihan

Pencarian menunggu pemilihan asinkron, mencegah callback ganda selama proses berjalan, serta mempertahankan kueri, kategori, dan pilihan jamak setelah kegagalan hanya selama pemiliknya masih aktif. Hanya false yang membiarkan popup terbuka tanpa galat selama pemiliknya masih aktif; undefined tetap berarti sukses. Klik asli bagian bawah mendukung aktivasi papan ketik dan browser.

## Patuhi masa aktif pemilihan

Sinyal pemilik opsional, penghapusan penyedia, dan pergantian akun mencegah penyelesaian UI lama tanpa mengurungkan operasi terkirim. Tutorial ruang kerja yang diterjemahkan menjelaskan penantian dan pemeriksaan tujuan sebelum mencoba lagi, dengan tetap mempertahankan alur dan pemutaran ulang.

Pemilihan pada bilah navigasi meneruskan hasil `false` dari `navigateTo` sebelum pelepasan rute, sehingga Pencarian tetap terbuka tanpa galat jika navigasi ditolak. Setelah `route-will-change` atau `pagehide` terjadi, Pencarian ditutup sebagai pembatalan siklus hidup meskipun halaman tujuan kemudian gagal dimuat. Umpan balik hasil selanjutnya menjadi tanggung jawab tujuan atau router, bukan popup Pencarian yang sudah ditutup.

## Komit

- [f8bc1a541514629c7091b7e9dbb6db7b924159b7](https://github.com/Cognis-Labs-HQ/Cognis/commit/f8bc1a541514629c7091b7e9dbb6db7b924159b7)
- [793b8de58bcc707683d5ebf26a93941655660ace](https://github.com/Cognis-Labs-HQ/Cognis/commit/793b8de58bcc707683d5ebf26a93941655660ace)
