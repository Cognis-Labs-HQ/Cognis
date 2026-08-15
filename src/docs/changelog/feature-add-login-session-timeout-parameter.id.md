# Masa berlaku sesi login yang dapat dikonfigurasi

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
