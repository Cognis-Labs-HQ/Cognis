# Share Utility

## Tambah Gateway Share

Cognis sekarang memiliki gateway Share khusus yang menangani pembuatan, daftar, pencabutan, dan resolusi token share publik. Gateway ini mendaftarkan flow share kanonis, menyimpan token share di DB, dan menyediakan halaman publik `/share/:token` yang dibangun dengan page composer standar dalam shell minimal.

## Bagikan Meeting

Modul Jitsi Meet sekarang menambahkan hook flow share untuk sumber daya meeting, menyediakan route pengelolaan share meeting, dan menampilkan tombol share di area meeting. Pemilik meeting dapat membuat tautan share yang kedaluwarsa, menyalinnya dari popup, lalu mencabutnya nanti.

## Popup Tautan Berbagi Generik

Popup tautan berbagi telah diekstrak dari modul Jitsi Meet menjadi utilitas generik `openShareLinksPopup` di `src/ui/reuse/share-links-popup.js`. Utilitas ini menerima fungsi callback API dan string label sebagai parameter sehingga dapat digunakan kembali oleh fitur apa pun. Impor kini menggunakan jalur absolut, sehingga memperbaiki kegagalan pengambilan impor dinamis di halaman Meetings.
