# Share Utility

## Tambah Gateway Share

Cognis sekarang memiliki gateway Share khusus yang menangani pembuatan, daftar, pencabutan, dan resolusi token share publik. Gateway ini mendaftarkan flow share kanonis, menyimpan token share di DB, dan menyediakan halaman publik `/share/:token` yang dibangun dengan page composer standar dalam shell minimal.

## Bagikan Meeting

Modul Jitsi Meet sekarang menambahkan hook flow share untuk sumber daya meeting, menyediakan route pengelolaan share meeting, dan menampilkan tombol share di area meeting. Pemilik meeting dapat membuat tautan share yang kedaluwarsa, menyalinnya dari popup, lalu mencabutnya nanti.

## Perbaikan: halaman Meetings kini memuat dengan benar

Modul popup share sekarang dimuat secara lazy ketika pengguna membuka dialog share, bukan saat halaman Meetings pertama kali dimuat. Ini mencegah kegagalan pengambilan share-popup dari menggagalkan seluruh modul halaman Meetings.
