# Penggunaan

Prosedur praktis untuk Basis Data Dalam Memori.

## Prasyarat

Pengganti uji ini tidak menyediakan persistensi atau rollback transaksi.

## Contoh

Buat MemoryDatabaseGateway, panggil query atau execute, lalu periksa statement dan params melalui getQueries().

## Hasil yang Diharapkan

query memberi rows kosong dan rowCount nol; execute memberi affectedRows nol.

## Pemecahan Masalah

DB_TYPE saja tidak memilih kelas ini melalui pemuat standar; pengujian persistensi perlu basis data nyata.
