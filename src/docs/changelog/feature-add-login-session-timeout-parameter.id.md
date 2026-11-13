# Masa berlaku sesi login yang dapat dikonfigurasi

**Cabang Fitur:** feature-add-login-session-timeout-parameter

## Administrator mengendalikan durasi sesi maksimum

Administrasi → Keamanan kini menyediakan batas waktu sesi login bawaan sekaligus maksimum.

## Pengguna dapat memilih sesi yang lebih singkat

Setiap pengguna dapat memilih batas waktu yang lebih singkat di Pengaturan → Keamanan. Token login yang baru diterbitkan memakai preferensi tersimpan tersebut dan tetap berlaku setelah aplikasi maupun basis data dimulai ulang.

## Pilih satuan waktu

Batas waktu sesi login kini dapat diatur dalam menit, jam, hari, atau minggu tanpa perlu mengonversi nilai ke menit.

## Izinkan sesi tanpa batas waktu

Administrator dapat memilih “Tidak pernah” untuk menonaktifkan kedaluwarsa sesi, disertai peringatan jelas bahwa pengaturan ini tidak disarankan di lingkungan produksi.

## Susun pengaturan keamanan

Pengaturan Keamanan Pengguna kini menampilkan Batas Waktu Sesi Login sebagai subbagian tersendiri, selaras dengan susunannya di Administrasi.

## Lacak perubahan batas waktu dengan andal

Kolom batas waktu sesi kini masuk dalam pelacakan perubahan yang belum disimpan di Administrasi dan Pengaturan Pengguna. Pengaturan Pengguna juga memisahkan tindakan kata sandi dan judul batas waktu dengan jarak antarbagian yang konsisten.

## Pertahankan pilihan pengguna dan laporkan kedaluwarsa

Pembaruan batas waktu Administrasi yang kompatibel kini mempertahankan durasi tersimpan setiap pengguna; batas sementara yang lebih rendah hanya membatasinya tanpa menimpanya. Sesi API yang kedaluwarsa segera mengembalikan pengguna ke halaman Login dan menampilkan pesan sesi kedaluwarsa yang tersedia.

## Atur ulang ke batas waktu global

Pengaturan Pengguna kini menyediakan tombol berikon urungkan di samping satuan durasi. Setelah diatur ulang, batas waktu sesi mengikuti nilai bawaan Administrasi saat ini dan berikutnya, bukan durasi khusus.

## Terapkan perubahan batas waktu dengan aman

“Tidak pernah” kini menyembunyikan kolom angka dan dapat disimpan tanpa kesalahan validasi. Pengaturan Pengguna menampilkan pilihan “Tidak pernah” yang dinonaktifkan saat kedaluwarsa dinonaktifkan secara global. Menyimpan atau mengatur ulang batas waktu pribadi mencabut seluruh sesi pengguna yang masih ada.

## Segarkan batas waktu global saat mengatur ulang

Kontrol atur ulang kini selalu tersedia. Setiap klik memuat ulang batas waktu Administrasi terbaru dan hanya menyiapkan pembaruan saat nilai efektif atau status mengikuti nilai bawaan berbeda.

## Pertahankan Tidak pernah saat login

Bootstrap autentikasi kini mempertahankan batas waktu global nol menit yang tersimpan, bukan menggantinya dengan nilai cadangan 12 jam, sehingga pengguna tersinkronisasi menerima sesi tanpa kedaluwarsa.

## Tampilkan hitung mundur sesi saat ini

Pengaturan Keamanan Pengguna kini menampilkan sisa waktu sesi saat ini di samping kontrol batas waktu. Hitung mundur menggunakan waktu kedaluwarsa yang dicatat saat sesi diterbitkan dan tidak ditampilkan untuk sesi yang tidak pernah berakhir.

## Simpan logika hitung mundur di Autentikasi

Pemformatan hitung mundur kini berada di gateway Autentikasi, bukan di penggunaan ulang UI inti. Tampilan sesi saat ini menggunakan minggu, hari, jam, menit, dan detik yang mudah dibaca.

## Pertahankan batas waktu yang dipilih selama verifikasi

Sesi masuk kini mempertahankan durasi yang dipilih administrator atau pengguna saat menyelesaikan verifikasi dua faktor atau penyiapan wajib, termasuk sesi yang tidak pernah kedaluwarsa.

## Tolak preferensi yang tidak dapat disimpan

Pembaruan batas waktu sesi kini mengembalikan galat ketersediaan tanpa mencabut sesi aktif ketika penyimpanan preferensi dinonaktifkan.

## Selaraskan dependensi internal

Modul Jitsi Meet kini mendeklarasikan versi adaptor Pesan lokal yang telah diuji agar pemeriksaan arsitektur di seluruh repositori tetap andal.

## Komit

- [70785d4](https://github.com/Cognis-Labs-HQ/Cognis/commit/70785d43ef6b76fb1d863dcc795ecb9bd3bcab7f)
