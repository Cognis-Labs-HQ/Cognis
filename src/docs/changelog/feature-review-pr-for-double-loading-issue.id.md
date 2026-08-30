# Navigasi Modul Andal

## Modul tidak lagi dipasang ulang selama navigasi SPA

Halaman Modul kini menggunakan pelindung pemasangan halaman langsung bersama. Memuatnya melalui router dasbor tidak lagi memicu pemasangan kedua yang menggandakan komponen navigasi dan mengganggu navigasi SPA berikutnya.

## Gaya halaman diisolasi selama navigasi

Router dasbor kini menghapus gaya halaman sebelumnya sebelum memasang halaman tujuan. Dengan demikian, navigasi dari Rapat ke Pesan tidak memungkinkan gaya khusus rapat mengubah tata letak Pesan saat sedang dibangun.
