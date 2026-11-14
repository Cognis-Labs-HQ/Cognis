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

Langkah riwayat percakapan mencakup area percakapan yang sama dalam gaya bawaan, gelembung percakapan, dan IRC. Pesan membungkus di dalam area tersebut dengan tetap mempertahankan pergantian baris dan Markdown. Panduan mempertahankan target, urutan, dan identitas penyelesaiannya.
