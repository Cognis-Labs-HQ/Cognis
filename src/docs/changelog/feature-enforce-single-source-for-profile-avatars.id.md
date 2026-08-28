# Avatar profil yang konsisten

**Feature Branch:** feature-enforce-single-source-for-profile-avatars

## Satu sumber avatar milik profil

Pemuatan avatar profil, tampilan cadangan, pembuatan inisial, dan warna inisial kini berasal dari kapabilitas CTX UI adaptor Profil. Pemanggil UI meminta kontribusi adaptor tersebut secara langsung melalui CTX tanpa memperkenalkan abstraksi profil di reuse inti, sehingga nama menghasilkan avatar yang sama di seluruh aplikasi.

## Pemanggil yang tersisa diaudit

Pesan, Kalender, Jitsi Meet, Nextcloud Whiteboard, Berbagi, tampilan kehadiran, dan avatar kelas kini hanya menjangkau adaptor Profil melalui kapabilitas CTX. Ekspor ulang gateway Sosial yang usang telah dihapus, dan pengujian regresi mencegah implementasi inisial baru, pengambilan berkas profil secara langsung, atau impor penyedia lama.

## Avatar bilah navigasi tetap terlihat di Study

Plugin bilah navigasi Profil kini menyediakan pemasok avatar melalui UI CTX dan tidak lagi mengimpor status tata letak. Penggunaan ulang shell dasbor juga mempertahankan avatar yang telah dimuat selama plugin dimuat, sehingga navigasi antar-subhalaman Study tidak lagi mengganti gambar profil untuk sementara.

## Pesan memuat dukungan avatar profil sebelum merender ruang

Halaman Pesan yang dimuat langsung kini menunggu kontribusi navigasi terdaftar, sehingga kapabilitas avatar Profil tersedia sebelum ruang dengan avatar atau inisial dirender.

## Ruang kelas Study mengikat konteks UI Profil dengan benar

Halaman ruang kelas kini mengimpor konteks UI sebagai kode modul yang dapat dijalankan, sehingga inisial pengajar dan kursi yang terisi dirender tanpa galat variabel yang hilang.

## Commits

- [fa7325e](https://github.com/Cognis-Labs-HQ/Cognis/commit/fa7325e7709ea2942c3ce560b033429297e5e8f7)
