# Tutorial Terpandu

Panduan ini menjelaskan tindakan yang tersedia dalam komponen ini.

## Gunakan Panduan

Kunjungi halaman di bawah untuk memulai panduan yang belum selesai. Gunakan ? di samping judul halaman untuk mengulang panduan yang selesai; Lewati mengakhiri pengulangan.

## Spesifikasi Teknis

| Halaman / bagian | Panduan          | Akses          |
| ---------------- | ---------------- | -------------- |
| `/calendar`      | Panduan Kalender | Pengguna masuk |

Panduan didaftarkan melalui kapabilitas publik `ui:tutorials` dengan definisi, katalog, target, dan sinyal masa hidup milik komponen. Halaman, bagian yang terlihat, dan persyaratan akses menentukan ketersediaan. Pelepasan komponen melepas panduannya. Penyajian dan penyelesaian bersama dijelaskan dalam [kontrak tutorial host](/docs/tutorials).

Navigasi tanggal menyorot kontrol tanggal yang terlihat meski tanpa acara. Perencanaan acara menyorot satu tempat pembuatan nyata, bukan mengulangi seluruh kalender.

## Ruang Kerja Responsif

Panel Kalender sempit menampilkan agenda berisi setiap acara dan tanggal terpilih, dengan pemilih tampilan serta tanggal yang ringkas. Panel lebar mempertahankan kisi kalender. Kolom tanggal mencapai tanggal kosong tanpa menggulir satu bulan. Kalender bersama memakai presentasi yang sama dan menegakkan akses baca saja.

## Konten Seluler yang Terbaca

Kalender menjaga kontrol di atas agenda yang dapat digulir tersendiri. Ikon Tambah Acara di samping setiap tanggal memiliki sasaran sentuh 44px dan label yang aksesibel.
