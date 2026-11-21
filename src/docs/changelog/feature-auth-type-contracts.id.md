# Kontrak Tipe Autentikasi

**Cabang Fitur:** feature-auth-type-contracts

## Batas Autentikasi Bertipe

Deklarasi Auth dan TFA kini menjelaskan peran akun, bidang identitas eksternal, perintah basis data, dan proyeksi sesi kuki yang sudah ada. Validasi batas waktu sesi tetap menerima nilai angka yang sama. Jaminan masuk dan percobaan faktor sekali pakai tidak berubah.

## Pengujian Komponen Sesuai Kontrak

Fikstur autentikasi menggunakan kontrak basis data terstruktur yang sebenarnya dan tahap alur terdaftar. Pengujian rute HTTP meneruskan metadata permintaan yang ditentukan serta mempertahankan pemeriksaan penolakan, penyimpanan, dan siklus hidup. Pemeriksaan tipe lengkap mencakup berkas produksi dan pengujian.

## Komit

- [111678dc84dee7c6d9bfcfbe83583b4c68f19392](https://github.com/Cognis-Labs-HQ/Cognis/commit/111678dc84dee7c6d9bfcfbe83583b4c68f19392)
- [c4f6ddf9f21a744f7d9133292f614e98467d829f](https://github.com/Cognis-Labs-HQ/Cognis/commit/c4f6ddf9f21a744f7d9133292f614e98467d829f)
- [be83c1b8857ed540915606f4477053f3f54b933a](https://github.com/Cognis-Labs-HQ/Cognis/commit/be83c1b8857ed540915606f4477053f3f54b933a)
