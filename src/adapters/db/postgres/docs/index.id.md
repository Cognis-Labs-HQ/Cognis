# Adapter Database PostgreSQL

## Ikhtisar

Adapter PostgreSQL menghubungkan Cognis ke server database PostgreSQL. Adapter ini menggunakan driver npm `pg` dan merupakan adapter yang direkomendasikan untuk deployment produksi yang memerlukan fitur SQL lanjutan, pencarian teks lengkap, atau layanan PostgreSQL terkelola. Diaktifkan dengan `DB_TYPE=postgresql`.

## Tanggung Jawab

- Mengimplementasikan antarmuka `DatabaseGateway`: `query`, `execute`, dan `transaction`.
- Mengelola connection pool PostgreSQL menggunakan string koneksi `DATABASE_URL`.
- Menyediakan dukungan placeholder posisi `$1`, `$2`, ….

## Arsitektur

`PostgresDbGateway` di `src/adapters/db/postgres/index.ts` memiliki `pg.Pool`. Kueri biasa dijalankan langsung melalui pool. Transaksi mencadangkan satu klien untuk `BEGIN`, semua pernyataan callback, serta `COMMIT` atau `ROLLBACK`, lalu melepaskannya. Adapter mendaftarkan pengosongan pool melalui kapabilitas ctx `system:lifecycle` agar penghentian server berhenti menerima pekerjaan sebelum menutup koneksi.

### Sintaks Placeholder

PostgreSQL menggunakan placeholder bernomor `$N`:

```sql
INSERT INTO accounts (id, email) VALUES ($1, $2)
```

## Konfigurasi

| Variabel                              | Default | Keterangan                                                             |
| ------------------------------------- | ------- | ---------------------------------------------------------------------- |
| `DB_TYPE`                             | —       | Harus `postgresql` untuk mengaktifkan adapter ini                      |
| `DATABASE_URL`                        | —       | URL koneksi PostgreSQL, mis. `postgresql://user:pass@host:5432/cognis` |
| `POSTGRES_POOL_MAX`                   | `10`    | Ukuran maksimum pool (1–100)                                           |
| `POSTGRES_POOL_IDLE_TIMEOUT_MS`       | `30000` | Batas waktu klien menganggur dalam milidetik (1.000–600.000)           |
| `POSTGRES_POOL_CONNECTION_TIMEOUT_MS` | `5000`  | Batas waktu koneksi dalam milidetik (100–120.000)                      |
| `POSTGRES_POOL_STATEMENT_TIMEOUT_MS`  | —       | Batas waktu pernyataan opsional dalam milidetik (1–3.600.000)          |
