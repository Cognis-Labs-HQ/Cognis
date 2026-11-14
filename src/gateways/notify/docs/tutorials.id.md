# Tutorial Terpandu

Panduan ini menjelaskan tindakan yang tersedia dalam komponen ini.

## Gunakan Panduan

Kunjungi halaman di bawah untuk memulai panduan yang belum selesai. Gunakan ? di samping judul halaman untuk mengulang panduan yang selesai; Lewati mengakhiri pengulangan.

## Spesifikasi Teknis

| Halaman / bagian                        | Panduan               | Akses          |
| --------------------------------------- | --------------------- | -------------- |
| `/settings` · `#notif-matrix-container` | Preferensi Notifikasi | Pengguna masuk |
| `/administration` · `#notifications`    | Pengiriman Notifikasi | Administrator  |
| `/administration` · `#broadcasts`       | Administrasi Siaran   | Administrator  |

Panduan didaftarkan melalui kapabilitas publik `ui:tutorials` dengan definisi, katalog, target, dan sinyal masa hidup milik komponen. Halaman, bagian yang terlihat, dan persyaratan akses menentukan ketersediaan. Pelepasan komponen melepas panduannya. Penyajian dan penyelesaian bersama dijelaskan dalam [kontrak tutorial host](/docs/tutorials).

Kontrol pengujian dan penerbitan opsional hanya disertakan saat tersedia; tombol uji berulang memakai satu target terlihat.

Pendaftaran memvalidasi judul dan langkah panduan terhadap katalog milik gateway sebelum menyediakan panduan. Bahasa Inggris, Jerman, Indonesia, dan Jepang didukung; nilai bahasa pilihan yang hilang atau kosong menggunakan kunci bahasa Inggris yang sama. Teks bahasa Inggris yang hilang tetap menghasilkan kesalahan terjemahan yang eksplisit. Mendaftarkan panduan di halaman dasbor lain tidak membuka Pengaturan atau Administrasi.
