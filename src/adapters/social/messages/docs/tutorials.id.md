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

## Ruang Kerja Responsif

Pesan menyesuaikan utas dan kolom penulisan dengan area layar yang terlihat. Percakapan membuka daftar ruang pada ponsel dan tablet. Escape mengembalikan fokus, pemilihan menutup daftar, dan perubahan orientasi mempertahankan draf. Layar pendek menggulir ruang kerja yang dapat digunakan alih-alih memotong kontrol.
