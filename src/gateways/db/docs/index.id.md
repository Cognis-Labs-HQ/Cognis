# Gateway Database

## Ikhtisar

Gateway Database adalah satu-satunya titik akses untuk semua operasi database di Cognis. Gateway ini menyediakan antarmuka executor yang seragam yang menyembunyikan perbedaan antara SQLite, PostgreSQL, dan MariaDB. Gateway membaca `DB_TYPE` dari environment, membuat executor yang sesuai, menginisialisasi skema, dan berkontribusi executor dan helper dialek ke capability store.

## Tanggung Jawab

- Membaca `DB_TYPE` dan membuat instance `DbExecutor` yang benar saat bootstrap.
- Menginisialisasi skema database dengan menjalankan skrip SQL dari direktori `sql/` adapter aktif.
- Berkontribusi `db:executor`, `db:type`, dan `db:dialect` ke capability store.
- Mengisi tabel `modules` dengan rekaman modul `cognis-core`.

## Arsitektur

### Antarmuka DatabaseGateway

```ts
export interface DatabaseGateway {
  query<Row = Record<string, unknown>>(statement: string, params?: unknown[]): Promise<QueryResult<Row>>;
  execute(statement: string, params?: unknown[]): Promise<{ affectedRows: number }>;
  transaction<T>(callback: (db: DatabaseGateway) => Promise<T>): Promise<T>;
}
```

### DbDialectHelper

`DbDialectHelper` yang dikontribusikan sebagai `db:dialect` menyediakan dua metode:

```ts
export interface DbDialectHelper {
  upsert(table: string, keyCol: string, keyVal: unknown, extraData: Record<string, unknown>): Promise<void>;
  insertIgnore(table: string, data: Record<string, unknown>): Promise<void>;
}
```

| Path | Tujuan |
| ---- | ------ |
| `src/gateways/db/gateway.ts` | Antarmuka `DatabaseGateway` |
| `src/gateways/db/executor.ts` | `createDbExecutor` |
| `src/gateways/db/init.ts` | `initializeDatabaseSchema` |
| `src/gateways/db/bootstrap.ts` | Titik masuk bootstrap; `DbDialectHelper` |

## Konfigurasi

| Variabel | Default | Keterangan |
| -------- | ------- | ---------- |
| `DB_TYPE` | `sqlite` | Backend database: `sqlite`, `postgresql`, atau `mariadb` |
| `DATABASE_URL` | — | String koneksi; diperlukan untuk `postgresql` atau `mariadb` |
| `SQLITE_PATH` | `./data/cognis.sqlite` | Path file SQLite; hanya digunakan saat `DB_TYPE=sqlite` |
