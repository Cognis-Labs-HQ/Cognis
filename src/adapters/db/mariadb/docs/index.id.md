# Adapter Database MariaDB

## Ikhtisar

Adapter MariaDB menghubungkan Cognis ke server database MariaDB (atau MySQL), cocok untuk deployment multi-server atau ketersediaan tinggi. Adapter ini menggunakan driver npm `mariadb` dan connection pooling. Diaktifkan dengan `DB_TYPE=mariadb`.

## Tanggung Jawab

- Mengimplementasikan antarmuka `DatabaseGateway`: `query`, `execute`, dan `transaction`.
- Mengelola connection pool MariaDB menggunakan string koneksi `DATABASE_URL`.
- Menyediakan dukungan placeholder posisi `?`.

## Arsitektur

`MariaDbGateway` di `src/adapters/db/mariadb/adapter.ts` membuat connection pool saat startup.

### Sintaks Placeholder

```sql
INSERT INTO accounts (id, email) VALUES (?, ?)
```

## Konfigurasi

| Variabel | Default | Keterangan |
| -------- | ------- | ---------- |
| `DB_TYPE` | — | Harus `mariadb` untuk mengaktifkan adapter ini |
| `DATABASE_URL` | — | URL koneksi MariaDB, mis. `mariadb://user:pass@host:3306/cognis` |
