# Penggunaan

Prosedur praktis untuk PostgreSQL.

## Prasyarat

Siapkan basis data PostgreSQL yang dapat dijangkau aplikasi.

## Contoh

Atur DB_TYPE=postgresql dan DATABASE_URL, mulai ulang, lalu verifikasi inisialisasi skema sebelum menerima pengguna.

## Hasil yang Diharapkan

Aplikasi menggunakan pool koneksi PostgreSQL; transaksi disimpan bersama atau dibatalkan saat gagal.

## Pemecahan Masalah

Periksa batas koneksi, kredensial, dan hak basis data. Mengganti penyedia tidak menyalin data lama.
