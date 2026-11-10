# Tutorial Terpandu

Panduan ini menjelaskan tindakan yang tersedia dalam komponen ini.

## Gunakan Panduan

Kunjungi halaman di bawah untuk memulai panduan yang belum selesai. Gunakan ? di samping judul halaman untuk mengulang panduan yang selesai; Lewati mengakhiri pengulangan.

## Spesifikasi Teknis

| Halaman / bagian                 | Panduan            | Akses          |
| -------------------------------- | ------------------ | -------------- |
| `/study`                         | Ringkasan Study    | Pengguna masuk |
| `^/study/(?:settings\|welcome)$` | Preferensi Belajar | Pengguna masuk |

## Ringkasan Dan Panduan Bahasa

Panduan `/study` menjelaskan subnavigasi aktivitas, bahasa yang diikuti, modul tersedia, pencarian kamus, dan pengaturan belajar. Kontrol yang tidak tersedia dilewati; alur kartu tidak diulang.

`study:tutorialTargets` menerbitkan target navigasi dan menggambar milik Study serta tindakan terlingkup `route` dan `attachDrawing`. `isEnrolled(language)` membaca preferensi terverifikasi melalui `study:navigation`, terikat akun aktif dan dibatalkan saat keikutsertaan berubah. Mengunjungi bahasa bukan berarti mengikutinya.

Panduan modul bahasa dapat dipilih dari menu ? pada ringkasan. Pilihan sadar ini membuka konten Explore bahasa tersebut. Panduan hanya otomatis dimulai pada kontennya sendiri dan mempertahankan lapisan aktif. Library memiliki alur kartu interaktif dan panduan umum cadangan; lihat dokumentasi komponennya.
