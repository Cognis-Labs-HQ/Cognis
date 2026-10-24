# Navigasi Offline

**Cabang Fitur:** feature-offline-navigation

## Kontrak Offline

Build produksi menyiapkan halaman pemulihan netral. Lisensi dan halaman Kesalahan berfungsi offline; tautan rute yang tidak tersedia dinonaktifkan dan navigasi langsung membuka popup kesalahan runtime. Kegagalan koneksi server mengaktifkan pengganti meskipun browser melaporkan jaringan aktif.

Deklarasikan `public: true` dan `offline: { assets: [...] }` pada rute SPA. Cantumkan semua dependensi runtime publik, termasuk katalog bahasa dan berkas data. Halaman harus bekerja tanpa permintaan API, data akun privat, atau penemuan seluruh penyedia host. Rute privat tidak dapat ikut serta. Gunakan tautan rute untuk navigasi. Dependensi yang belum dikenal atau diambil tetap tidak tersedia.

Respons API, kredensial, dan HTML terautentikasi tidak disimpan. Invalidasi modul menghapus katalog rute publik dan aset modul; aset dengan revisi harus cocok dengan katalog saat ini. Perubahan jarak jauh tidak dapat diketahui saat terputus: hanya revisi publik terakhir yang diketahui tersedia. Pemulihan memperbarui katalog dan memuat ulang melalui penjaga perubahan yang belum disimpan, lalu memulihkan otorisasi server terbaru. Pembaruan worker menunggu tab yang ada ditutup dan menyiapkan aset pemulihan sebelum aktivasi. Kunjungan pertama tanpa worker terpasang tidak dapat dimulai offline.

## Pilihan Pengingat

Pilih beberapa pengingat melalui kotak centang standar yang terlihat dan simpan semuanya sekaligus. Menghapus seluruh pilihan menonaktifkan pengingat, termasuk ketika kalender memiliki nilai bawaan. Jarak waktu pengingat khusus yang sudah ada tetap tersedia saat mengedit.

## Komit

- [bfc96cb](https://github.com/Cognis-Labs-HQ/Cognis/commit/bfc96cbe42c045aa334dedb15f9991c41fa146a2)
- [980643a](https://github.com/Cognis-Labs-HQ/Cognis/commit/980643a2d392559194e361745e7aae10f04c7bf2)
- [9e208d3](https://github.com/Cognis-Labs-HQ/Cognis/commit/9e208d34f2a8b9b117c4029e7a26c712efc11dd5)
