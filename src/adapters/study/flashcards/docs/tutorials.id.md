# Tutorial Terpandu

Panduan ini menjelaskan tindakan yang tersedia dalam komponen ini.

## Gunakan Panduan

Kunjungi halaman di bawah untuk memulai panduan yang belum selesai. Gunakan ? di samping judul halaman untuk mengulang panduan yang selesai; Lewati mengakhiri pengulangan.

## Spesifikasi Teknis

| Halaman / bagian                          | Panduan               | Akses          |
| ----------------------------------------- | --------------------- | -------------- |
| `^/study/(?:[a-z-]+/)?flashcards(?:/\|$)` | Panduan Kartu Belajar | Pengguna masuk |
| Flashcards · `[data-study-session]`       | Kelola Dek            | Pengguna masuk |
| Flashcards · `[data-practice]`            | Latihan Dengan Dek    | Pengguna masuk |

Panduan didaftarkan melalui kapabilitas publik `ui:tutorials` dengan definisi, katalog, target, dan sinyal masa hidup milik komponen. Halaman, bagian yang terlihat, dan persyaratan akses menentukan ketersediaan. Pelepasan komponen melepas panduannya. Penyajian dan penyelesaian bersama dijelaskan dalam [kontrak tutorial host](/docs/tutorials).
