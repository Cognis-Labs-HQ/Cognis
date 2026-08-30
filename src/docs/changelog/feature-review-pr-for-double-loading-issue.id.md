# Navigasi Modul Andal

## Modul tidak lagi dipasang ulang selama navigasi SPA

Halaman Modul kini menggunakan pelindung pemasangan halaman langsung bersama. Memuatnya melalui router dasbor tidak lagi memicu pemasangan kedua yang menggandakan komponen navigasi dan mengganggu navigasi SPA berikutnya.

## Gaya halaman diisolasi selama navigasi

Router dasbor kini mengenali gaya milik rute dari pemuatan halaman langsung dan menghapus gaya halaman sebelumnya sebelum memasang halaman tujuan. Dengan demikian, navigasi dari Rapat ke Pesan tidak meninggalkan aturan tombol khusus rapat yang mengubah bilah sisi penyusun halaman.

## Kontrol navigasi tampil dengan gayanya

Pesan kini memuat setiap lembar gaya percakapan sebelum pemasangan, bukan mengandalkan rangkaian impor CSS, sehingga avatar percakapan tidak berkedip dalam ukuran tanpa gaya. Plugin notifikasi juga menunggu lembar gayanya sebelum menyisipkan lonceng ke bilah navigasi.

## Gaya akar rute tidak lagi bocor

Router dasbor kini menghapus kelas milik rute dari akar aplikasi bersama sebelum memasang halaman berikutnya. Dengan demikian, gaya Rapat tidak dapat tetap aktif pada bilah sisi penyusun halaman meskipun modul meninggalkan kelas akarnya sebelum rapat dimulai.

## Gaya kapabilitas bersama tetap tersedia

Gaya yang dimuat oleh kapabilitas UI bersama kini tetap tersedia saat rute berubah, sedangkan hanya gaya yang secara eksplisit dimiliki rute yang dihapus. Tampilan avatar profil tetap lengkap ketika bernavigasi dari Profil ke Rapat. Cakupan siklus hidup otomatis kini memeriksa setiap entri halaman SPA inti, gateway, dan adapter.
