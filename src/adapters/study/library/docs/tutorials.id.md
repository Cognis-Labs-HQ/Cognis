# Tutorial Terpandu

Panduan ini menjelaskan tindakan yang tersedia dalam komponen ini.

## Gunakan Panduan

Kunjungi halaman di bawah untuk memulai panduan yang belum selesai. Gunakan ? di samping judul halaman untuk mengulang panduan yang selesai; Lewati mengakhiri pengulangan.

## Spesifikasi Teknis

| Halaman / bagian                               | Panduan              | Akses          |
| ---------------------------------------------- | -------------------- | -------------- |
| `^/study/explore(?:/\|$)`                      | Jelajahi Pustaka     | Pengguna masuk |
| `^/study/library/search(?:/\|$)`               | Pencarian Kamus      | Pengguna masuk |
| `^/study/(?:library/)?requests(?:/\|$)`        | Permintaan Pustaka   | Pengguna masuk |
| `^/study/library(?:/\|$)` · `.library-browser` | Administrasi Pustaka | Administrator  |

Panduan didaftarkan melalui kapabilitas publik `ui:tutorials` dengan definisi, katalog, target, dan sinyal masa hidup milik komponen. Halaman, bagian yang terlihat, dan persyaratan akses menentukan ketersediaan. Pelepasan komponen melepas panduannya. Penyajian dan penyelesaian bersama dijelaskan dalam [kontrak tutorial host](/docs/tutorials).

`scope` membatasi target dan penemuan. `visibleWhen` opsional memerlukan satu elemen terlihat tanpa membatasi target ke turunannya; target tetap berada dalam akar komponen. Administrasi Pustaka memakainya untuk visibilitas browser sambil menyoroti pencarian di bilah samping. Selektor tidak valid menggagalkan registrasi dan membersihkan pemilik.

Explore dimulai dari menu lapisan, filter, dan contoh favorit yang stabil. Klik kartu pilihan membuka cabang detail bersyarat; Berikutnya melewatinya. Detail serta kontrol menulis opsional disorot terpisah dalam dialog milik fitur yang ditutup saat cabang berakhir.

Langkah favorit dan detail memakai satu wadah kartu yang stabil, termasuk di halaman Alfabet dan setelah pengurutan berubah.
