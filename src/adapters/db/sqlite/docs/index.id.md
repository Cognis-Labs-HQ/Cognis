# Adapter Database SQLite

## Ikhtisar

Adapter SQLite menyediakan database relasional tanpa dependensi untuk deployment Cognis di server tunggal. Adapter ini menggunakan klien kompatibel `better-sqlite3` untuk menyimpan semua data platform dalam satu file di filesystem lokal. SQLite adalah titik awal yang direkomendasikan untuk deployment kecil, pengembangan lokal, dan pengujian.

## Tanggung Jawab

- Mengimplementasikan antarmuka `DatabaseGateway`: `query`, `execute`, dan `transaction`.
- Membuka (dan jika perlu membuat) file database SQLite saat startup.
- Mengaktifkan mode WAL dan penegakan foreign key pada setiap koneksi.

## Arsitektur

`SqliteDbGateway` di `src/adapters/db/sqlite/adapter.ts` membungkus handle database `better-sqlite3`.

### Sintaks Placeholder

Gunakan placeholder posisi `?`:

```sql
SELECT * FROM users WHERE id = ?
```

## Konfigurasi

| Variabel      | Default                | Keterangan                                                   |
| ------------- | ---------------------- | ------------------------------------------------------------ |
| `DB_TYPE`     | —                      | Harus `sqlite` untuk mengaktifkan adapter ini                |
| `SQLITE_PATH` | `./data/cognis.sqlite` | Path ke file database SQLite; dibuat otomatis jika tidak ada |
