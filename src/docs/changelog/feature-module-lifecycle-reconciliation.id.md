# Hasil tindakan modul

**Cabang Fitur:** feature-module-lifecycle-reconciliation

## Hasil tindakan modul

Aktifkan dan Nonaktifkan tetap sibuk selama permintaan perubahan dan pemeriksaan status lanjutannya berjalan. Pembacaan status menetapkan status yang diamati saat ini, bukan membuktikan bahwa permintaan ini diterapkan. Meninggalkan halaman Modul tidak membatalkan perubahan yang sudah dikirim. Halaman lama tidak boleh menampilkan umpan balik terlambat atau mengubah tampilan pengganti. Pergantian akun membatalkan wewenang pekerjaan antrean dan hasil terlambat. Respons yang hilang memicu satu pembacaan status baru dengan batas lima detik, tanpa mengulangi perubahan secara otomatis. Jika hasil belum pasti, Periksa status menggantikan tindakan modul. Pembacaan berikutnya dan kunjungan SPA tetap mengunci tindakan jika status yang diamati masih berlawanan. Tindakan kembali hanya setelah status yang diminta diamati. Panduan penyiapan opsional dan pembaruan katalog yang dibatalkan tidak mengubah aktivasi yang telah dikonfirmasi menjadi penolakan. Pembatalan konfigurasi wajib tetap membatalkan aktivasi satu kali. Jika respons pembatalan hilang, hasilnya dicocokkan sebagai nonaktif hanya ketika pembacaan otoritatif menunjukkan status nonaktif. Jika tidak, hasilnya tetap belum pasti.

Tutorial marketplace menyertakan Periksa status hanya jika kontrolnya tersedia dan melewati tindakan biasa ketika hasil belum pasti. Identitas pemilik dan penyelesaian serta masa aktif popup dan tutorial konfigurasi tetap dipertahankan. Halaman Modul tidak memiliki paket komponen atau manifes berversi tersendiri. Versi dan hash API, Core, serta penyedia opsional tidak berubah.

Peristiwa hasil rekonsiliasi ditandai observed-state, berbeda dari acknowledged-response. Status yang diamati tidak membuktikan bahwa permintaan ini diterapkan. API tidak menyediakan tanda terima operasi yang persisten. Kepemilikan klien yang belum terselesaikan dipertahankan antar-mount SPA, bukan setelah pemuatan ulang browser penuh. Setelah itu hanya status server saat ini tersedia; hasil akhir permintaan sebelumnya dan bootstrap Study nyata belum dapat dipastikan.

Modul tidak dapat memenuhi dependensi selama tindakan modul masih berjalan atau hasilnya belum pasti, termasuk penonaktifan dan pembatalan penyiapan. Tindakan berulang dan kunjungan SPA mempertahankan batasan ini, dan aktivasi dalam antrean memeriksa kesiapan lagi saat mulai dijalankan tanpa mengulangi pilihan dependensi opsional. Aktivasi yang diamati tetap berbeda dari penyiapan yang selesai; pembatalan yang ditolak juga membuat penyiapan belum selesai. Menyimpan pengaturan dapat mengonfirmasi penyiapan, tetapi tidak menyelesaikan ketidakpastian perubahan. Status nonaktif yang diharapkan dan dibaca secara otoritatif memungkinkan aktivasi eksplisit biasa.

Terjemahan yang hilang untuk peringatan kesiapan dependensi memicu kegagalan secara eksplisit, termasuk pada tindakan berulang, bukan menampilkan teks kesalahan internal. Tombol tetap dipulihkan dari status sibuk setelah kegagalan.

Pengaturan serta tindakan pembaruan dan pergantian kanal memakai pemeriksaan akun, status sibuk, dan hasil yang sama, termasuk aktivasi sementara, penonaktifan, dan pembatalan. Setiap aktivasi dan pemulihan memeriksa kembali dependensi yang dipilih. Pemulihan setelah instalasi hanya diizinkan setelah penolakan pengajuan yang pasti atau hasil akhir pekerjaan yang telah dikonfirmasi. Respons pengajuan atau status yang hilang serta tanda terima pekerjaan yang tidak tersedia tetap belum pasti, tanpa pemulihan atau pengulangan. Instalasi dengan hasil yang hilang tetap diblokir selama sesi halaman. Periksa status memperbarui katalog, tetapi tidak membuktikan pekerjaan telah selesai. Pemuatan ulang penuh membuang ketidakpastian lokal ini tanpa membuktikan penyelesaian; tanda terima persisten dan pemulihan setelah pemuatan ulang penuh tidak ditambahkan.

## Komit

- [9a0290cfd75a5a56679e3217a5cb5f5825246174](https://github.com/Cognis-Labs-HQ/Cognis/commit/9a0290cfd75a5a56679e3217a5cb5f5825246174)
- [f721c2f72d1d73228f4d1dd2cb7f027e065e27c8](https://github.com/Cognis-Labs-HQ/Cognis/commit/f721c2f72d1d73228f4d1dd2cb7f027e065e27c8)
- [e632fac6ba342fe403c0a2fb4ce82d5a7dde816a](https://github.com/Cognis-Labs-HQ/Cognis/commit/e632fac6ba342fe403c0a2fb4ce82d5a7dde816a)
- [56d32ec39813023e57e3cfcd5b2a05b2ed73fb27](https://github.com/Cognis-Labs-HQ/Cognis/commit/56d32ec39813023e57e3cfcd5b2a05b2ed73fb27)
- [4eb495fdc16c8bf8ae39a8a28d605244dd8a868f](https://github.com/Cognis-Labs-HQ/Cognis/commit/4eb495fdc16c8bf8ae39a8a28d605244dd8a868f)

- [ee4ea4b80851aa7706cea39c29dd97be27575e61](https://github.com/Cognis-Labs-HQ/Cognis/commit/ee4ea4b80851aa7706cea39c29dd97be27575e61)
