# Menyempurnakan pengelolaan berbagi

## Menyederhanakan perilaku berbagi akun dan tamu

Notifikasi berbagi pengguna mempertahankan sesi akun yang ditentukan, sedangkan tautan publik berpassword meminta password tanpa membuka atau menyimpannya di gantungan kunci akun sebelum masuk ke mode tamu. Kolom pembaruan kosong mempertahankan nilai lama, dan dialog berbagi milik modul kini selalu memakai teks password dan penghapusan yang telah diperbaiki.

## Mengamankan berbagi pengguna dan memperjelas kontrol

Berbagi pengguna tetap mewajibkan akun yang ditentukan alih-alih membuat akses tamu yang dapat dipindahtangankan. Tindakan berbagi kini memakai tampilan netral, pilihan izin membedakan Hanya Baca dan Baca & Tulis dengan jelas, dialog kata sandi memberi petunjuk singkat bagi penerima, dan berbagi tamu yang dihapus berakhir tanpa pengalihan atau pemberitahuan berulang.

## Memulihkan pembaruan berbagi dan perpindahan halaman yang mulus

Editor berbagi terfokus kini mengirim perubahan masa berlaku secara konsisten dan menampilkan tindakan pembaruan dengan tampilan konfirmasi standar. Navigasi dalam aplikasi mempertahankan gaya halaman saat ini sampai tujuan selesai dipasang sehingga konten lama tidak sempat berkedip tanpa gaya.

## Memfilter dan langsung menghapus berbagi

Pil ringkasan Total, Terkirim, dan Diterima kini memfilter tabel Berbagi. Berbagi yang berhasil ditolak atau dihapus langsung menghilang, dan setiap tindakan baris destruktif hanya menggunakan tampilan batal standar.

## Mempertahankan akses akun untuk berbagi milik sendiri dan yang diterima

Membuka berbagi Papan Tulis sebagai pembuatnya atau berbagi pengguna Rapat sebagai penerimanya kini mempertahankan sesi akun terautentikasi saat navigasi dalam aplikasi maupun setelah penyegaran. Tujuan memasang halaman akun lengkap, mempertahankan seluruh navigasi, dan tidak lagi masuk ke tampilan tamu terbatas.

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
