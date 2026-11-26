# Penggunaan

Prosedur praktis untuk SQLite.

## Prasyarat

Runtime penyemat harus menyediakan klien SQLite; penerapan standar tidak menghubungkan kelas ini sebagai penyedia yang dapat dipilih.

## Contoh

Sediakan SqliteClient dengan all, run, dan exec, lalu gunakan SqliteDbGateway untuk kueri dan transaksi di runtime Anda.

## Hasil yang Diharapkan

Kueri mengembalikan baris; callback transaksi berhasil melakukan commit dan kegagalan memicu rollback.

## Pemecahan Masalah

DB_TYPE saja tidak menghubungkan SQLite ke server standar. Periksa integrasi klien dan akses berkas runtime.
