# Menyempurnakan pengelolaan berbagi

## Mempertahankan akses akun untuk berbagi milik sendiri dan yang diterima

Membuka berbagi Papan Tulis sebagai pembuatnya atau berbagi pengguna Rapat sebagai penerimanya kini mempertahankan sesi akun terautentikasi. Konten yang dibagikan tetap memiliki navigasi akun lengkap dan tidak lagi masuk ke tampilan tamu terbatas.

## Mengisolasi kontrol dan gaya halaman tujuan

Pengeditan tata letak tetap dinonaktifkan pada halaman Papan Tulis dan Berbagi. Setiap navigasi dalam aplikasi kini membangun ulang dok tindakan halaman, membuang tindakan yang tidak disediakan kembali oleh tujuan, memuat paket stylesheet lengkap, dan menghapus gaya rute yang tidak lagi berlaku.

## Memusatkan pengelolaan pada satu berbagi

Halaman Berbagi kini membuka editor ringkas yang hanya memuat formulir berbagi yang dipilih. Jenis berbagi tetap terkunci, pembaruan hanya memengaruhi catatan basis data tersebut, dan dialog tidak lagi terbuka dua kali saat navigasi dalam aplikasi.

## Menyelaraskan kontrol berbagi

Halaman Berbagi tidak lagi menambahkan ruang vertikal di luar kartunya. Tombol berbagi juga selalu menggunakan tampilan batal untuk tindakan yang berpotensi mengurangi akses.

## Memulihkan rute konten yang dibagikan

Halaman gateway dan modul yang terdaftar kini memuat titik masuk dasbor serta paket stylesheet lengkapnya sendiri, baik setelah penyegaran peramban maupun saat navigasi dalam aplikasi. Karena itu, halaman Berbagi, Rapat, dan Papan Tulis tetap menampilkan bilah atas, footer, tata letak, dan gaya komponennya.

## Mempertahankan berbagi Rapat selama masa berlaku yang ditentukan

Berbagi Rapat kini tetap dapat diselesaikan di seluruh instans rapat dan sesi yang telah berakhir. Akses berlanjut sampai berbagi itu sendiri kedaluwarsa, ditolak, atau dicabut, sedangkan alur autentikasi berulang menggunakan kembali sesi berbagi yang sudah diselesaikan.
