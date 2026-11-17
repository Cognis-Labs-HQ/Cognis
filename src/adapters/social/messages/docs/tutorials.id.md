# Tutorial Terpandu

Panduan ini menjelaskan tindakan yang tersedia dalam komponen ini.

## Gunakan Panduan

Kunjungi halaman di bawah untuk memulai panduan yang belum selesai. Gunakan ? di samping judul halaman untuk mengulang panduan yang selesai; Lewati mengakhiri pengulangan.

## Spesifikasi Teknis

| Halaman / bagian     | Panduan       | Akses          |
| -------------------- | ------------- | -------------- |
| `^/messages(?:/\|$)` | Panduan Pesan | Pengguna masuk |

Panduan didaftarkan melalui kapabilitas publik `ui:tutorials` dengan definisi, katalog, target, dan sinyal masa hidup milik komponen. Halaman, bagian yang terlihat, dan persyaratan akses menentukan ketersediaan. Pelepasan komponen melepas panduannya. Penyajian dan penyelesaian bersama dijelaskan dalam [kontrak tutorial host](/docs/tutorials).

Sinyal router membatasi registrasi tutorial dan komposer halaman. Menggulir mempertahankan kontrol tutorial; target yang sudah tampil lalu hilang sementara dipulihkan tanpa maju diam-diam.

Panduan menjelaskan penulisan sekali, lalu menyorot input pesan dan kontrol pratinjau secara terpisah.

Pengelolaan ruang tidak dimasukkan dalam alur dan jumlah langkah sampai judul ruang tersedia.

## Konten Seluler yang Terbaca

Buka percakapan melalui tombol panel sudut ganda bersama di kiri atas. Judul ruang memakai dua baris terlihat sambil mempertahankan judul lengkap yang aksesibel. Riwayat pesan memperoleh lebih banyak ruang dan draf bertahan saat orientasi berubah.

## Bilah Samping Ringkas

Pesan menampilkan Ruang Baru, percakapan, dan Templat berdekatan dengan menggunakan seluruh lebar bilah samping. Daftar kosong dan pendek tidak lagi direntangkan setinggi panel. Daftar ruang dan templat yang panjang memakai satu area gulir Composer.
