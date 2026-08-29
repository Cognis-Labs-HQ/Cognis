# Jendela komponen bersama untuk tamu

## Halaman bersama kini membuka jendela komponen tersinkron secara otomatis

Tamu berbagi kini dapat menerima jendela komponen yang diminta oleh halaman bersama yang terpasang tanpa gestur aktivasi peramban. Dengan demikian, whiteboard rapat dan perilaku periferal tersinkronnya terbuka bagi tamu seperti bagi peserta Cognis yang masuk, sementara broker halaman komponen tetap memvalidasi elemen host dan sinyal siklus hidup yang diminta.

## Batas integrasi diperjelas

Otorisasi jendela komponen tidak memberikan akses ke API komponen anak. Cognis kini menyelesaikan akses tamu terdelegasi melalui flow Share yang netral terhadap sumber daya. Komponen pemilik sumber daya asal yang dibagikan membuktikan hubungannya dengan target yang diminta dan menyatakan kapabilitas target yang diizinkan; komponen target hanya menggunakan kapabilitas Share generik.

## Penyelenggara dapat membuka komponen rapat tersinkron

Penyelenggara yang sudah masuk dan peserta lain dengan akses langsung kini dapat menerima permintaan jendela komponen saat melihat sumber daya bersama yang aktif. Karena itu, membuka papan tulis rapat akan memasang jendela komponennya dan memungkinkan panel rapat beralih ke gambar-dalam-gambar meskipun sinkronisasi mengirim permintaan setelah interaksi browser awal.

## Rute komponen tamu dimuat setelah autentikasi

Halaman Share kini menyegarkan penemuan rute SPA setelah autentikasi tamu. Rute komponen papan tulis yang tidak tersedia selama bootstrap halaman anonim kemudian diselesaikan dengan sesi tamu aktif sehingga jendela papan tulis tersinkron dapat dipasang di dalam rapat.

## Konteks tamu mencapai papan tulis tersemat

Cognis kini membawa konteks Share aktif melalui flow halaman komponen ke pemasangan komponen tamu. Papan tulis tersemat dapat mengenali berbagi rapat yang didelegasikan, mempertahankan autentikasi tamu, dan memuat papan tersinkron, bukan memasuki jalur khusus akun.

## Akses terdelegasi netral terhadap sumber daya

Gateway Share kini menyediakan `share:resolveDelegatedAccess` dan memiliki validasi cakupan asal token tamu. Pemilik sumber daya memperluas flow delegasi generik untuk membuktikan hubungan tanpa mengikat komponen target ke penyedia rapat atau integrasi bernama lainnya.
