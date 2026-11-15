# Terminal dan Masukan CLI

**Cabang Fitur:** feature-cli-terminal-input-integration634

## Pisahkan panduan dan hasil

Kemajuan dijeda selama panduan menerima masukan dan dilanjutkan setelah pengiriman. Panduan dan kemajuan memakai stderr; stdout hanya untuk hasil akhir. EOF, Ctrl-C, dan SIGINT gagal tanpa mutasi perintah serta memulihkan terminal. Argumen eksplisit tetap tersedia untuk skrip. Pembacaan penemuan komponen dapat terjadi sebelum panduan.

## Kumpulkan masukan yang valid

CLI 0.4.7 memakai skema milik perintah untuk bidang jalur, isi, dan kueri wajib tanpa bergantung pada kelompok bantuan. Kolom biasa yang ditandai pemilik dapat terlihat; kata sandi, token, dan kolom tanpa deklarasi tetap tersembunyi. Spasi string, koleksi kosong yang valid, salah, dan nol dipertahankan. Validasi jenis menolak angka, boolean, dan bentuk JSON tidak valid sebelum permintaan perintah. Kueri wajib mempertahankan nilai kosong eksplisit; nama kolom berulang ditolak saat pendaftaran. Kebijakan API dan validasi bisnis tidak berubah.

## Verifikasi

Pengujian CLI sebenarnya melalui PTY serta pendaftaran publik mencakup tabrakan keluaran, pembatalan, kerahasiaan, koleksi kosong, kata sandi tepat, jenis, kueri, dan nama ambigu. Pengujian terfokus tidak membuktikan hasil layanan nyata atau setiap alur yang ditawarkan. Perbaikan hasil penghapusan dan penyiapan TFA tidak disertakan.

## Commit

- [1fc472d13029bc3a88c24185a284efe3255b86ca](https://github.com/Cognis-Labs-HQ/Cognis/commit/1fc472d13029bc3a88c24185a284efe3255b86ca)
