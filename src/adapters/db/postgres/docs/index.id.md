# Adapter Database PostgreSQL

## Ikhtisar

Adapter PostgreSQL menghubungkan Cognis ke server database PostgreSQL. Adapter ini menggunakan driver npm `pg` dan merupakan adapter yang direkomendasikan untuk deployment produksi yang memerlukan fitur SQL lanjutan, pencarian teks lengkap, atau layanan PostgreSQL terkelola. Diaktifkan dengan `DB_TYPE=postgresql`.

## Tanggung Jawab

- Mengimplementasikan antarmuka `DatabaseGateway`: `query`, `execute`, dan `transaction`.
- Mengelola connection pool PostgreSQL menggunakan string koneksi `DATABASE_URL`.
- Menyediakan dukungan placeholder posisi `$1`, `$2`, ….

## Arsitektur

`PostgresDbGateway` di `src/adapters/db/postgres/adapter.ts` membuat `pg.Pool` saat startup.

### Sintaks Placeholder

PostgreSQL menggunakan placeholder bernomor `$N`:

```sql
INSERT INTO accounts (id, email) VALUES ($1, $2)
```

## Konfigurasi

| Variabel | Default | Keterangan |
| -------- | ------- | ---------- |
| `DB_TYPE` | — | Harus `postgresql` untuk mengaktifkan adapter ini |
| `DATABASE_URL` | — | URL koneksi PostgreSQL, mis. `postgresql://user:pass@host:5432/cognis` |
