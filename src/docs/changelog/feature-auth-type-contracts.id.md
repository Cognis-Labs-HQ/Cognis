# Kontrak Tipe Autentikasi

**Cabang Fitur:** feature-auth-type-contracts

## Batas Autentikasi Bertipe

Deklarasi Auth dan TFA kini menjelaskan peran akun, bidang identitas eksternal, perintah basis data, dan proyeksi sesi kuki yang sudah ada. Validasi batas waktu sesi tetap menerima nilai angka yang sama. Jaminan masuk dan percobaan faktor sekali pakai tidak berubah.

## Pengujian Komponen Sesuai Kontrak

Fikstur autentikasi menggunakan kontrak basis data terstruktur yang sebenarnya dan tahap alur terdaftar. Pengujian rute HTTP meneruskan metadata permintaan yang ditentukan serta mempertahankan pemeriksaan penolakan, penyimpanan, dan siklus hidup. Pemeriksaan tipe lengkap mencakup berkas produksi dan pengujian.

## Komit

- [f953a13e8b8ec88c0907be13cc1891c0800ff25d](https://github.com/Cognis-Labs-HQ/Cognis/commit/f953a13e8b8ec88c0907be13cc1891c0800ff25d)
