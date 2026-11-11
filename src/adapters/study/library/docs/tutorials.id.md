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

## Varian Bahasa Dan Cabang

Penyedia menerbitkan `study:libraryTutorials` versi 1 melalui tindakan terlingkup. Modul memanggil `register({ owner, id, language, titleKey, text, stringsBaseUrls, signal })` dengan identitas tetap, bahasa, dan teks langkah terlokalisasi. Hasilnya `{ id, dispose }`. Library memiliki selektor, tindakan kartu, pemilihan rute, dan masa hidup dialog; modul tidak mengimpor implementasinya. Pendaftaran bahasa ganda ditolak dan penghapusan mengembalikan panduan Explore umum.

Hanya bahasa yang diikuti secara eksplisit menerima panduan modul. Di `/study`, panduan dipilih manual; di Explore bahasa terkait, varian menggantikan panduan umum. Pendaftaran dan penemuan tidak pernah menavigasi. Peluncuran sadar dari ringkasan membuka konten bahasa; lapisan Explore aktif dipertahankan. Cabang pembuatan dapat berpindah dari lapisan karakter ke lapisan yang mendukung kartu baru.

Panduan meliputi lapisan, filter, satu contoh favorit/kartu yang tetap, dialog detail, audio pelafalan tersedia, latihan menulis, dan alat menggambar. Klik kartu atau Gambar membuka cabang; Berikutnya melewati cabang yang belum dibuka. Kembali dari kanvas menuju pembuka kartu karena menggambar menutup dialog detail.

Buat membuka pemilih jenis kartu asli, lalu editor, tab, dan kontrol simpan. Pengguna dapat menjelajah tanpa menyimpan; panduan tidak pernah mengirim kartu. Dialog dan kanvas mengikuti masa hidup cabang; Kembali, Mulai Ulang, selesai, dan penghapusan menutupnya dengan konfirmasi pembuangan perubahan.

Hasil pencarian, permintaan, dan administrasi Library menghilangkan langkah khusus rekaman saat tidak ada rekaman terlihat. Kontrol ringkasan tetap tersedia tanpa menunggu target yang tidak ada.
