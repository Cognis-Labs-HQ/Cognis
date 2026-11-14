# Pertahankan Pilihan Teks Pesan

**Cabang Fitur:** feature-message-selection-recovered

## Pertahankan Pilihan Selama Pembaruan Langsung

Isi pesan yang tidak berubah mempertahankan simpul DOM saat pesan, reaksi, atau metadata pembaca berubah. Pilihan maju, mundur, dan lintas pesan bersebelahan tetap pada teks yang sama. Teks terpilih yang berubah atau dihapus mengikuti aturan pilihan bawaan.

## Pertahankan Riwayat dan Status Reaksi

Pembaruan langsung dan Muat Pesan Sebelumnya digabung tanpa kehilangan baris yang sudah dimuat. Pesan antrean tidak dihitung dalam paginasi server. Reaksi lama yang diakui langsung diperbarui lalu halaman yang ada disegarkan; kegagalan membaca tidak mengulang mutasi.

Respons langsung atau riwayat yang terlambat mempertahankan proyeksi antrean yang lebih baru, termasuk setelah pekerjaan tertunda dibersihkan atau diakui. Permintaan tanpa perubahan memajukan kepemilikan snapshot, dan proyeksi yang diabaikan membatalkan tanda tangan tersimpan. Kegagalan menyegarkan reaksi mempertahankan status yang diakui dan pilihan teks pada pesan baru maupun lama.

Respons halaman terbaru yang usang tidak lagi mengganti publikasi yang lebih baru, termasuk pesan antrean yang diakui, metadata, dan status permintaan. Permintaan riwayat eksplisit tetap digabungkan. Kesalahan pembacaan lama mempertahankan konten terbaru yang terlihat.

Pembacaan riwayat yang tumpang tindih kini memakai urutan milik tampilan bersama reaksi yang diakui. Metadata baris yang lebih baru dan penghapusan yang terbukti tetap dipertahankan saat hasil lama tiba. Kesalahan pembacaan lanjutan yang sudah digantikan tidak ditampilkan, sedangkan kegagalan pembacaan saat ini dan mutasi tetap terlihat. Cakupan digabung menurut pembacaan aktif lalu dilepas ketika selesai, dengan batas cap waktu yang konservatif.

Respons cache dan transport bersama yang sedang berjalan tidak memperoleh otoritas server baru. Respons tersebut mempertahankan baris yang dikenal dan dapat mengisi riwayat lama yang belum dimuat tanpa menghidupkan kembali bagian awal yang sudah lengkap menurut hasil langsung. Urutan konfirmasi dibedakan dari bukti pembacaan langsung untuk paginasi. Tanda tangan bersumber memungkinkan pembacaan baru menyelaraskan muatan mentah yang identik. Uji regresi mencakup fallback luring, pembacaan bersama sebelum konfirmasi, kedua urutan penyelesaian, permintaan tanpa perubahan yang monoton, dan batas pembacaan tertahan.

Hasil tampilan usang kini tetap dibedakan dari kegagalan pembacaan saat ini pada semua pemanggil perender. Penyelesaian lama yang berhasil atau gagal setelah pergantian gaya, kunci, atau kontainer dalam ruang yang sama tidak menampilkan kesalahan tindakan usang atau memulai pembaruan status baca dan mengetik lanjutan.

## Uji Perilaku DOM Nyata

Messages 2.7.43 menambahkan pengujian jsdom berversi pasti khusus pengujian melalui perender yang diekspor dan kontrak klien luring. Panduan riwayat yang dilokalkan menjelaskan pilihan teks dan pemuatan pesan sebelumnya. Pemeriksaan geometri mencakup kebijakan gulir, bukan piksel browser atau papan klip.

## Komit

- https://github.com/Cognis-Labs-HQ/Cognis/commit/5e97da45b9978f41038e9ec45649457d21f8557c
