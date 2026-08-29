# Adapter Database MariaDB

## Ikhtisar

Adapter MariaDB menghubungkan Cognis ke server database MariaDB (atau MySQL), cocok untuk deployment multi-server atau ketersediaan tinggi. Adapter ini menggunakan driver npm `mysql2` dan connection pooling. Diaktifkan dengan `DB_TYPE=mariadb`.

## Tanggung Jawab

- Mengimplementasikan antarmuka `DatabaseGateway`: `query`, `execute`, dan `transaction`.
- Mengelola connection pool MariaDB menggunakan string koneksi `DATABASE_URL`.
- Menyediakan dukungan placeholder posisi `?`.

## Arsitektur

`MariaDbGateway` di `src/adapters/db/mariadb/index.ts` memiliki promise pool `mysql2`. Kueri biasa dijalankan langsung melalui pool. Transaksi mencadangkan satu koneksi untuk callback, melakukan commit atau rollback pada koneksi tersebut, lalu melepaskannya dalam blok `finally`. Adapter mendaftarkan pengosongan pool melalui kapabilitas ctx `system:lifecycle`.

Pemulihan mandiri skema mempertahankan klausa kunci asing saat menambahkan kolom yang hilang dan melaporkan kegagalan perbaikan indeks atau kolom alih-alih mengabaikannya.

### Sintaks Placeholder

```sql
INSERT INTO accounts (id, email) VALUES (?, ?)
```

## Konfigurasi

| Variabel                             | Default | Keterangan                                                        |
| ------------------------------------ | ------- | ----------------------------------------------------------------- |
| `DB_TYPE`                            | —       | Harus `mariadb` untuk mengaktifkan adapter ini                    |
| `DATABASE_URL`                       | —       | URL koneksi MariaDB, mis. `mariadb://user:pass@host:3306/cognis`  |
| `MARIADB_POOL_MAX`                   | `10`    | Ukuran maksimum pool (1–100)                                      |
| `MARIADB_POOL_IDLE_TIMEOUT_MS`       | `30000` | Batas waktu koneksi menganggur dalam milidetik (1.000–600.000)    |
| `MARIADB_POOL_CONNECTION_TIMEOUT_MS` | `5000`  | Batas waktu koneksi dalam milidetik (100–120.000)                 |
| `MARIADB_STARTUP_TIMEOUT_MS`         | `60000` | Jendela maksimum kesiapan startup dalam milidetik (1.000–600.000) |
| `MARIADB_STARTUP_RETRY_INTERVAL_MS`  | `1000`  | Jeda antarpercobaan kesiapan dalam milidetik (100–30.000)         |
