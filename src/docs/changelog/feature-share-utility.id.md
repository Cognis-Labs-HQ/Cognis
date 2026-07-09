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

## Hapus File Jitsi Meet yang Usang

File-file `ui/app/index.js` dan `ui/pages/meetings.html` pada modul Jitsi Meet menjadi kode mati
akibat refaktor sebelumnya dan tidak pernah dikirimkan ke browser. `index.js` mengandung impor
yang rusak (`/static/reuse/page-composer.js` alih-alih `/static/reuse/page-composer/index.js`),
yang akan menyebabkan kegagalan muat jika file tersebut pernah diakses. Kedua file telah dihapus.

## Perbaiki Tautan Share Publik yang Diblokir oleh Pemeriksaan Autentikasi

Handler rute gateway kalender menggunakan pemeriksaan `pathname.includes("/share")`
yang terlalu luas, yang secara tidak sengaja menangkap URL tautan share publik
(`/share/shr_...`) dan mengembalikan kesalahan unauthorized sebelum gateway share
dapat menyajikan halaman tersebut. Pemeriksaan kini dipersempit hanya untuk rute
API share kalender di bawah `/api/v1/calendar/calendars/:id/share`.

## Perbaiki Fokus Input Label Popup Share

Saat popup tautan share dibuka, kolom input label kini secara otomatis menerima
fokus. Sebelumnya, tombol tutup (tombol pertama dalam DOM popup) secara keliru
difokuskan, sehingga mencegah pengetikan langsung menggunakan keyboard pada kolom
label.

## Tambah Sesi Share Tamu Berbasis Flow

Resolusi share sekarang menerbitkan token akses tamu terbatas dan mengembalikannya ke halaman share, yang menukar token itu sementara ke sesi API aktif lalu memulihkan token sebelumnya saat keluar halaman. Flow share Jitsi Meet kini me-mount UI Meetings asli lewat `share-mount.js` alih-alih renderer kartu statis, dan validasi tamu share ditambahkan untuk route join/config/peserta meeting serta akses baca-saja kunci dan pesan room social.
