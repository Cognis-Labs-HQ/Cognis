# Jendela komponen bersama untuk tamu

## Halaman bersama kini membuka jendela komponen tersinkron secara otomatis

Tamu berbagi kini dapat menerima jendela komponen yang diminta oleh halaman bersama yang terpasang tanpa gestur aktivasi peramban. Dengan demikian, whiteboard rapat dan perilaku periferal tersinkronnya terbuka bagi tamu seperti bagi peserta Cognis yang masuk, sementara broker halaman komponen tetap memvalidasi elemen host dan sinyal siklus hidup yang diminta.

## Batas integrasi diperjelas

Otorisasi jendela komponen tidak memberikan akses ke API komponen anak. Jitsi Meet harus menerima tamu berbagi pada rute status whiteboard dan mengekspos hubungan rapat-ke-whiteboard, sedangkan Nextcloud Whiteboard harus menerima akses terdelegasi dari berbagi rapat yang telah divalidasi agar sinkronisasi dapat berfungsi sepenuhnya.

## Penyelenggara dapat membuka komponen rapat tersinkron

Penyelenggara yang sudah masuk dan peserta lain dengan akses langsung kini dapat menerima permintaan jendela komponen saat melihat sumber daya bersama yang aktif. Karena itu, membuka papan tulis rapat akan memasang jendela komponennya dan memungkinkan panel rapat beralih ke gambar-dalam-gambar meskipun sinkronisasi mengirim permintaan setelah interaksi browser awal.

## Rute komponen tamu dimuat setelah autentikasi

Halaman Share kini menyegarkan penemuan rute SPA setelah autentikasi tamu. Rute komponen papan tulis yang tidak tersedia selama bootstrap halaman anonim kemudian diselesaikan dengan sesi tamu aktif sehingga jendela papan tulis tersinkron dapat dipasang di dalam rapat.

## Konteks tamu mencapai papan tulis tersemat

Cognis kini membawa konteks Share aktif melalui flow halaman komponen ke pemasangan komponen tamu. Papan tulis tersemat dapat mengenali berbagi rapat yang didelegasikan, mempertahankan autentikasi tamu, dan memuat papan tersinkron, bukan memasuki jalur khusus akun.
