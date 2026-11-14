# Tutorial Terpandu

Panduan ini menjelaskan tindakan yang tersedia dalam komponen ini.

## Gunakan Panduan

Kunjungi halaman di bawah untuk memulai panduan yang belum selesai. Gunakan ? di samping judul halaman untuk mengulang panduan yang selesai; Lewati mengakhiri pengulangan.

Panduan opsi undangan menjelaskan cara memperbaiki penerima. Kirim Email Undangan menggunakan kolom email wajib dengan umpan balik terjemahan dan mengembalikan fokus ke kolom yang perlu diperbaiki. Buat undangan dan Enter memakai validasi yang sama. Menutup dialog membuang alamat yang belum selesai; membuka kembali menampilkan kolom kosong. Token pendaftaran dan riwayat undangan tetap memiliki kontrol yang sama.

## Spesifikasi Teknis

| Halaman / bagian                    | Panduan               | Akses          |
| ----------------------------------- | --------------------- | -------------- |
| `/invite`                           | Panduan Undangan      | Pengguna masuk |
| `/administration` · `#registration` | Kebijakan Pendaftaran | Administrator  |

Panduan didaftarkan melalui kapabilitas publik `ui:tutorials` dengan definisi, katalog, target, dan sinyal masa hidup milik komponen. Halaman, bagian yang terlihat, dan persyaratan akses menentukan ketersediaan. Pelepasan komponen melepas panduannya. Penyajian dan penyelesaian bersama dijelaskan dalam [kontrak tutorial host](/docs/tutorials).
