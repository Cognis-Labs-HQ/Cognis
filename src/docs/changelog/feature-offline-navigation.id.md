# Navigasi Offline

**Cabang Fitur:** feature-offline-navigation

## Kontrak Offline

Build produksi menyiapkan halaman pemulihan netral. Lisensi dan halaman Kesalahan berfungsi offline; tautan rute yang tidak tersedia dinonaktifkan dan navigasi langsung yang tidak tersedia tidak menampilkan kesalahan. Kegagalan koneksi server mengaktifkan pengganti meskipun browser melaporkan jaringan aktif.

Deklarasikan `public: true` dan `offline: { assets: [...] }` pada rute SPA. Cantumkan semua dependensi runtime publik, termasuk katalog bahasa dan berkas data. Halaman harus bekerja tanpa permintaan API, data akun privat, atau penemuan seluruh penyedia host. Rute privat tidak dapat ikut serta. Gunakan tautan rute untuk navigasi. Dependensi yang belum dikenal atau diambil tetap tidak tersedia.

Service worker tidak menyimpan respons API, kredensial, atau HTML terautentikasi. Invalidasi modul menghapus katalog rute publik dan aset modul; aset dengan revisi harus cocok dengan katalog saat ini. Perubahan jarak jauh tidak dapat diketahui saat terputus: hanya revisi publik terakhir yang diketahui tersedia. Pemulihan memperbarui katalog dan memuat ulang melalui penjaga perubahan yang belum disimpan, lalu memulihkan otorisasi server terbaru. Pembaruan worker menunggu tab yang ada ditutup dan menyiapkan aset pemulihan sebelum aktivasi. Kunjungan pertama tanpa worker terpasang tidak dapat dimulai offline.

## Pilihan Pengingat

Pilih beberapa pengingat melalui kotak centang standar yang terlihat dan simpan semuanya sekaligus. Menghapus seluruh pilihan menonaktifkan pengingat, termasuk ketika kalender memiliki nilai bawaan. Jarak waktu pengingat khusus yang sudah ada tetap tersedia saat mengedit.

## Belajar Offline

Mode Offline aktif secara bawaan di Pengaturan. Menonaktifkannya memulihkan peringatan koneksi dan pesan kesalahan yang ada serta menonaktifkan fallback worker. Saat aktif, hilangnya koneksi mengalihkan aplikasi ke mode offline tanpa pemberitahuan kesalahan; navigasi yang tidak tersedia diblokir tanpa popup kesalahan.

Study menyimpan snapshot JSON ringan dengan batas ukuran di tab saat ini: skema, data karakter/kartu yang diizinkan, lokasi, ID yang telah dilihat, favorit, dan dek yang pernah dibuka. Skema bahasa mengaktifkannya melalui `metadata.offline: { cache: "lightweight" }`. Cache Library menampung paling banyak 16 MB dan 100 pembacaan; cache baca lain paling banyak 4 MB dan 100 pembacaan. Byte audio, respons kamus, kredensial, dan dokumen terautentikasi tidak disimpan secara permanen.

Pratinjau Explore memakai data cache yang telah diotorisasi. Menggambar dan latihan kartu bekerja secara lokal. Penyelesaian, ulasan, ID yang dilihat, dan status akhir favorit diantrekan; progres, XP, dan hadiah menjadi resmi setelah konfirmasi server. Audio serta permintaan kamus/ElevenLabs berhenti. Penyuntingan, penghapusan, dan berbagi memerlukan koneksi. Hanya konten yang pernah dimuat dalam batas cache yang tersedia.

Study privat memerlukan sesi akun yang sama, pernah diverifikasi, dan belum kedaluwarsa di tab yang sama. Muat ulang dan kunjungan pertama tetap mengikuti kontrak offline khusus halaman publik. Perubahan akun/sesi, preferensi, siklus hidup modul, dan pelepasan penyedia membatalkan snapshot privat. Pencabutan akses server tidak dapat diketahui saat terputus. Pemulihan memakai penjaga perubahan yang belum disimpan lalu memuat ulang otorisasi server.

## Antrean dan Persetujuan

Host menyediakan `offline:outbox`, `offline:state`, dan `offline:accessPolicy` melalui ctx. Komponen mendaftarkan pengirim selama masa hidup penyedia dan ID operasi stabil melalui `offline:enqueue`; `offline:flush` mengotorisasi dan mengirim. Antrean permanen per akun dibatasi 1.000 catatan dan 1 MB selama tujuh hari, tanpa token. ID serta waktu asli dipertahankan; kegagalan sementara dicoba ulang, catatan yang dikonfirmasi atau ditolak permanen dihapus. Penolakan menampilkan peringatan terlokalisasi. Keluar menghapus antrean akun; pergantian akun tidak mengirim data akun lain. Menonaktifkan Mode Offline menghentikan catatan baru. Antrean lama tetap dapat dikirim saat online.

Pemulihan memperbarui penyedia dan menjalankan `authenticate-session` sebelum tahap akhir `afterSession` mengirim aktivitas. Penyedia wajib mendeklarasikan `offlineAccessGuard` dalam katalog server. Persyaratan yang tidak diketahui atau persetujuan yang belum ada memblokir akses offline. Terms of Service menyimpan versi dokumen terakhir yang diambil dan persetujuan terkonfirmasi server per akun. Versi baru yang belum disetujui langsung memblokir pembacaan, navigasi, dan catatan offline serta pengiriman sampai persetujuan online berhasil. Persetujuan offline tidak tersedia. Snapshot privat tetap di tab; hanya antrean terbatas dan snapshot dokumen hukum bertahan setelah muat ulang.

## Komit

- [bfc96cb](https://github.com/Cognis-Labs-HQ/Cognis/commit/bfc96cbe42c045aa334dedb15f9991c41fa146a2)
- [980643a](https://github.com/Cognis-Labs-HQ/Cognis/commit/980643a2d392559194e361745e7aae10f04c7bf2)
- [9e208d3](https://github.com/Cognis-Labs-HQ/Cognis/commit/9e208d34f2a8b9b117c4029e7a26c712efc11dd5)
- [39bc5c3](https://github.com/Cognis-Labs-HQ/Cognis/commit/39bc5c3c81a7b87b096d8ed665aa3ddeee7e4c93)
- [5cfeb11](https://github.com/Cognis-Labs-HQ/Cognis/commit/5cfeb11f0684d87760f8cc697bd42df4fcdd72b9)
