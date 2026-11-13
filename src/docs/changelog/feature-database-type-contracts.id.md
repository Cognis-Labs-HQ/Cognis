# Kontrak Tipe Basis Data

**Cabang Fitur:** feature-database-type-contracts

## Batas Basis Data Bertipe

Inisialisasi basis data hanya memerlukan kemampuan eksekusi mentah yang digunakannya. Eksekutor aplikasi publik tetap menggunakan perintah terstruktur, sedangkan transaksi adaptor mempertahankan tipe eksekutor mentah. Deklarasi kolom menyertakan sumber penggantian nama opsional yang sudah tersedia. PostgreSQL mengembalikan nol jika jumlah baris dari pengandar bernilai null; baris dan jumlah numerik tetap dipertahankan. MariaDB mempersempit varian perintah sebelum menormalisasi kondisi. Data uji milik adaptor tetap menggunakan tanda tangan kueri generik.

## Komit

- https://github.com/Cognis-Labs-HQ/Cognis/commit/54d8066a0d9bdbe38d6b4baa0d79c67e49cc56dc
