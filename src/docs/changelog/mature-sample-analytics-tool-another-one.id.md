# Analitik di Administrasi

## Modul Sample Analytics digantikan oleh bagian Analitik lengkap di Administrasi

Modul Sample Analytics telah dikembangkan menjadi alat analitik aktivitas pengguna
yang lengkap. Elemen dasbor placeholder sebelumnya telah dihapus.

## Tab Analitik di Administrasi menampilkan metrik pengguna nyata

Administrasi → Analitik menampilkan kartu statistik ringkasan (total pengguna, pengguna
aktif dalam 7 hari terakhir, pendaftaran baru dalam periode yang dipilih), grafik batang
tren pendaftaran untuk 7, 30, atau 90 hari terakhir, dan rincian peran dengan bilah
persentase terintegrasi.

## Filter rentang waktu interaktif memperbarui semua grafik dan statistik secara langsung

Filter rentang waktu memungkinkan admin beralih antara jendela 7, 30, dan 90 hari.
Mengklik Segarkan mengambil ulang semua data dan memperbarui kartu statistik, grafik
batang, dan log acara tanpa memuat ulang halaman.

## API pencatatan acara kustom

Endpoint baru `POST /api/v1/modules/analytics/activity-log` memungkinkan admin
mencatat acara bernama kustom (dengan metadata opsional) ke tabel acara analitik.
Acara yang dicatat muncul di log Acara dalam bagian Analitik administrasi.

## Endpoint API baru untuk metrik dan data deret waktu

Tiga rute API yang diautentikasi admin menggantikan endpoint metrik stub sebelumnya:
`/api/v1/modules/analytics/metrics` (ringkasan dan rincian peran),
`/api/v1/modules/analytics/series` (deret pendaftaran harian), dan
`/api/v1/modules/analytics/activity-log` (log acara kustom terbaru).
