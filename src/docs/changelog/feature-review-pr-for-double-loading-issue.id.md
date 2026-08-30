# Navigasi Modul Andal

## Modul tidak lagi dipasang ulang selama navigasi SPA

Halaman Modul kini menggunakan pelindung pemasangan halaman langsung bersama. Memuatnya melalui router dasbor tidak lagi memicu pemasangan kedua yang menggandakan komponen navigasi dan mengganggu navigasi SPA berikutnya.

## Gaya halaman diisolasi selama navigasi

Router dasbor kini mengenali gaya milik rute dari pemuatan halaman langsung dan menghapus gaya halaman sebelumnya sebelum memasang halaman tujuan. Dengan demikian, navigasi dari Rapat ke Pesan tidak meninggalkan aturan tombol khusus rapat yang mengubah bilah sisi penyusun halaman.
