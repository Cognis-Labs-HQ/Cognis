# Tutorial Terpandu

Panduan ini menjelaskan tindakan yang tersedia dalam komponen ini.

## Gunakan Panduan

Kunjungi halaman di bawah untuk memulai panduan yang belum selesai. Gunakan ? di samping judul halaman untuk mengulang panduan yang selesai; Lewati mengakhiri pengulangan.

## Spesifikasi Teknis

| Halaman / bagian    | Panduan              | Akses          |
| ------------------- | -------------------- | -------------- |
| `^/profile(?:/\|$)` | Profil dan Postingan | Pengguna masuk |

Panduan didaftarkan melalui kapabilitas publik `ui:tutorials` dengan definisi, katalog, target, dan sinyal masa hidup milik komponen. Halaman, bagian yang terlihat, dan persyaratan akses menentukan ketersediaan. Pelepasan komponen melepas panduannya. Penyajian dan penyelesaian bersama dijelaskan dalam [kontrak tutorial host](/docs/tutorials).

Identitas, postingan, dan tindakan akun menargetkan bagian profil hasil render, termasuk bagian postingan kosong. Sinyal halaman memiliki masa hidup panduan.

Posting memakai target daftar tersendiri meski editor terlihat. Sorotan aksi sosial mengikuti ukuran tombol; pratinjau editor dihilangkan pada profil lain.

Identitas dan aksi sosial muncul sebelum langkah posting dan pratinjau yang berurutan.
