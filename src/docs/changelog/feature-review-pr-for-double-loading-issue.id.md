# Navigasi Modul Andal

**Cabang Fitur:** feature-review-pr-for-double-loading-issue

## Modul tidak lagi dipasang ulang selama navigasi SPA

Halaman Modul kini menggunakan pelindung pemasangan halaman langsung bersama. Memuatnya melalui router dasbor tidak lagi memicu pemasangan kedua yang menggandakan komponen navigasi dan mengganggu navigasi SPA berikutnya.

## Gaya halaman diisolasi selama navigasi

Router dasbor kini mengenali gaya milik rute dari pemuatan halaman langsung dan menghapus gaya halaman sebelumnya sebelum memasang halaman tujuan. Dengan demikian, navigasi dari Rapat ke Pesan tidak meninggalkan aturan tombol khusus rapat yang mengubah bilah sisi penyusun halaman.

## Kontrol navigasi tampil dengan gayanya

Pesan kini memuat setiap lembar gaya percakapan sebelum pemasangan, bukan mengandalkan rangkaian impor CSS, sehingga avatar percakapan tidak berkedip dalam ukuran tanpa gaya. Plugin notifikasi juga menunggu lembar gayanya sebelum menyisipkan lonceng ke bilah navigasi.

## Komit

- [4506d46](https://github.com/Cognis-Labs-HQ/Cognis/commit/4506d46a613a8bb643d65a4ca5e6e0821c5f43fb)
- [63976d1](https://github.com/Cognis-Labs-HQ/Cognis/commit/63976d1f112ff39eed1565d36fed8ae0500ad51b)
- [14c1e2f](https://github.com/Cognis-Labs-HQ/Cognis/commit/14c1e2fcb3904d92709a38a8cb13ca8fe7ed2a10)
- [e6fbb62](https://github.com/Cognis-Labs-HQ/Cognis/commit/e6fbb62939f204ab29eec66842a1705ff26c7800)
- [77207d0](https://github.com/Cognis-Labs-HQ/Cognis/commit/77207d05b3bf404ecfccf24ed4a9a4c8a6319ffb)
- [5ccdca8](https://github.com/Cognis-Labs-HQ/Cognis/commit/5ccdca846f9696e63dbe7b0871c110d5fd7c5d51)
- [609c964](https://github.com/Cognis-Labs-HQ/Cognis/commit/609c9640c24cbbf5d66703fbe41832cf2c9ba962)
- [035ad2a](https://github.com/Cognis-Labs-HQ/Cognis/commit/035ad2ad52ee11911478e758e9138d78dcd581a3)
