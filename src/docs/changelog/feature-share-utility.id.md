# Share Utility

## Tambah Gateway Share

Cognis sekarang memiliki gateway Share khusus yang menangani pembuatan, daftar, pencabutan, dan resolusi token share publik. Gateway ini mendaftarkan flow share kanonis, menyimpan token share di DB, dan menyediakan halaman publik `/share/:token` yang dibangun dengan page composer standar dalam shell minimal.

## Bagikan Meeting

Modul Jitsi Meet sekarang menambahkan hook flow share untuk sumber daya meeting, menyediakan route pengelolaan share meeting, dan menampilkan tombol share di area meeting. Pemilik meeting dapat membuat tautan share yang kedaluwarsa, menyalinnya dari popup, lalu mencabutnya nanti.

## Popup Tautan Berbagi Generik

Popup tautan berbagi telah diekstrak dari modul Jitsi Meet menjadi utilitas generik `openShareLinksPopup` di `src/ui/reuse/share-links-popup.js`. Utilitas ini menerima fungsi callback API dan string label sebagai parameter sehingga dapat digunakan kembali oleh fitur apa pun. Impor kini menggunakan jalur absolut, sehingga memperbaiki kegagalan pengambilan impor dinamis di halaman Meetings.

## Perbaikan Kegagalan Muat Halaman Meetings Akibat 401 pada share-adapter.js

Impor statis tingkat atas dari `share-adapter.js` di `app.js` halaman Meetings memicu respons
401 saat modul di-parse, sebelum sesi pengguna dapat memenuhi pemeriksaan autentikasi apa pun.
Hal ini membatalkan impor dan mencegah seluruh rute SPA `/meetings` dimuat.
`share-adapter.js` kini diambil sebagai impor dinamis lazim yang diletakkan berdampingan dengan
`share-links-popup.js` di dalam handler klik tombol share, sehingga file tersebut tidak pernah
diminta sampai pengguna berada dalam sesi yang terautentikasi dan dengan sengaja membuka
popup share.
