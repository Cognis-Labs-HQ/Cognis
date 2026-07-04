# Peningkatan Stabilitas UI

## Animasi ubin dan tab yang mulus saat pembaruan waktu nyata

Pembaruan waktu nyata yang dinamis kini tidak lagi mereset animasi ubin aktif atau header tab. Ubin ruang kerja hanya diurutkan ulang di DOM ketika urutan mereka benar-benar berubah, sehingga animasi CSS yang sedang berjalan pada ubin aktif tidak pernah terganggu oleh siklus polling di latar belakang.

## Fokus bidang input chat dipertahankan saat pembaruan

Mengetik di kolom pesan kelas kini tidak lagi kehilangan fokus saat kelas diperbarui di latar belakang. Elemen aktif browser disimpan sebelum penggantian DOM apa pun dan dipulihkan setelahnya, menjaga posisi kursor dan status input tetap utuh.

## Tab papan tulis disembunyikan jika modul tidak dikonfigurasi

Tab Papan Tulis di papan tulis kelas kini dikendalikan oleh apakah modul Nextcloud Whiteboard benar-benar dikonfigurasi di server. Endpoint snapshot mengekspos flag `whiteboardEnabled` dan UI menggunakannya untuk menghapus tab sepenuhnya saat modul tidak ada, alih-alih menampilkannya dalam keadaan selalu dinonaktifkan.

## Materi kelas kini terbuka di penampil tertanam

Materi kelas berformat PDF dan gambar kini ditampilkan dalam penampil tertanam seperti yang diharapkan. Dua masalah mendasar telah diselesaikan: kondisi balapan di mana polling waktu nyata dapat menimpa kunci materi yang baru dipilih sebelum disimpan ke server, serta pembaruan DOM penuh yang hilang yang mencegah ubin penampil materi diperbarui saat guru menyiarkan materi baru kepada siswa.
