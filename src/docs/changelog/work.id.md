# Terapkan Siklus Hidup Study dan Modul yang Aman

**Cabang Fitur:** work

## Patuhi Kebijakan Penghapusan Relasi Library

Perencanaan penghapusan Library kini mengikuti kebijakan `restrict`, `detach`, atau `cascade` pada setiap relasi skema, bukan menganggap semua referensi masuk sebagai kaskade.

## Jalankan Persistensi Progress di Dalam Flow

Adapter Progress kini menyimpan event secara permanen dan membangun ulang proyeksi pada tahap `persist` dan `project`, sehingga ekstensi berikutnya melihat status yang sudah tersimpan.

## Tutup Celah Validasi Modul

Validasi batas kini mendeteksi pemanggilan CommonJS `require()` statis dan memindai seluruh modul sebelum entrypoint API yang dinonaktifkan dimuat.

## Pertahankan Navigasi Bahasa Study yang Kanonis

Tujuan Study yang diingat hanya digunakan kembali bila bahasa tujuan benar-benar mendaftarkan halaman tersebut; jika tidak, navigasi memakai tujuan bawaan yang dideklarasikan bahasa itu.

## Evaluasi Perlindungan Infrastruktur UI Core Baru

Instruksi kontribusi AI kini mewajibkan evaluasi perlindungan secara eksplisit saat fungsi, objek hasil render, komponen, atau kelas UI core dibuat atau diperluas.

## Commit

- https://github.com/Cognis-Labs-HQ/Cognis/commit/3dadb7fdb2f6269d735e6b8f7d0cdf8991ac5808
