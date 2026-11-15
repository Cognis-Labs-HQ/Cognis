# Perlindungan Simpan Layout

**Cabang Fitur:** feature-composer-save-ownership640

## Lindungi Penyimpanan Tertunda

Editor utama dan bersarang mempertahankan perlindungan saat meninggalkan halaman selama Selesai atau Setel ulang menunggu konfirmasi. Perubahan layout dan pengiriman berulang diblokir selama permintaan. Penyimpanan yang dikonfirmasi mempertahankan profil kolom persis seperti yang dikirim tanpa berbagi data draf yang dapat berubah. Konfirmasi memerlukan HTTP `200` dan JSON `data.saved === true`; tanpa akun atau token akses, tidak ada permintaan tulis.

## Pulihkan Tanpa Kehilangan Draf

Respons HTTP yang gagal dan kesalahan permintaan mempertahankan draf yang dilindungi serta menampilkan petunjuk pemulihan terlokalisasi. Pengulangan atau pembuangan dilakukan secara sengaja; respons yang hilang membuat hasil server tidak diketahui dan permintaan tidak pernah diulang otomatis. Dokumentasi bersama kini menjelaskan URL preferensi dan struktur profil saat ini. Respons yang belum terkonfirmasi juga mempertahankan perlindungan. Membuang draf kembali ke acuan lokal sebelumnya, yang belum tentu merupakan status server terkonfirmasi; percobaan ulang mengirim permintaan baru. Subhalaman bersarang yang tidak aktif tidak menerima pemberitahuan terlambat, dan composer yang telah dilepas mengabaikan penyelesaian.

Panduan pemulihan ditutup saat Anda mencoba lagi, membuang perubahan, meninggalkan bagian, atau menutup halaman, sehingga pesan lama tidak muncul kembali dalam sesi penyuntingan lain.

## Komit

- [c5c0edc70ed43280c2c0c8918e4d12ae17e14ad9](https://github.com/Cognis-Labs-HQ/Cognis/commit/c5c0edc70ed43280c2c0c8918e4d12ae17e14ad9)
