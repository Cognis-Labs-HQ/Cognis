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

Perencanaan acara mempertahankan target slot pembuatan dan menjelaskan formulir yang lebih lebar, urutan baca ringkas, serta pengguliran. Langkah acara menjelaskan undangan tertunda yang bergaris. ID panduan, enam langkah, nilai highlightNext, dan masa aktif halaman tidak berubah. Kalender kosong tetap memiliki target navigasi tanggal dan pembuatan acara.
