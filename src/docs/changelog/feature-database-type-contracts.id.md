# Kontrak Tipe Basis Data

**Cabang Fitur:** feature-database-type-contracts

## Batas Basis Data Bertipe

Inisialisasi basis data hanya memerlukan kemampuan eksekusi mentah yang digunakannya. Eksekutor aplikasi publik tetap menggunakan perintah terstruktur, sedangkan transaksi adaptor mempertahankan tipe eksekutor mentah. Deklarasi kolom menyertakan sumber penggantian nama opsional yang sudah tersedia. PostgreSQL mengembalikan nol jika jumlah baris dari pengandar bernilai null; baris dan jumlah numerik tetap dipertahankan. MariaDB mempersempit varian perintah sebelum menormalisasi kondisi. Data uji milik adaptor tetap menggunakan tanda tangan kueri generik.

## Komit

- [ef1d7ff1a0531bd6540c099f82411b6e3e8d2af3](https://github.com/Cognis-Labs-HQ/Cognis/commit/ef1d7ff1a0531bd6540c099f82411b6e3e8d2af3)
