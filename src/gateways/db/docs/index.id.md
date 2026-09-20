# Gateway Database

## Ikhtisar

Gateway Database adalah satu-satunya titik akses untuk semua operasi database di Cognis. Gateway ini menyediakan antarmuka executor yang seragam yang menyembunyikan perbedaan antara PostgreSQL dan MariaDB. Gateway membaca `DB_TYPE` dari environment, membuat executor yang sesuai, menginisialisasi skema, dan berkontribusi executor dan helper dialek ke capability store.

## Tanggung Jawab

- Membaca `DB_TYPE` dan membuat instance `DbExecutor` yang benar saat bootstrap.
- Menginisialisasi skema database dengan menjalankan skrip SQL dari direktori `sql/` adapter aktif.
- Berkontribusi `db:executor`, `db:type`, dan `db:dialect` ke capability store.
- Mengisi tabel `modules` dengan rekaman modul `cognis-core`.

## Arsitektur

### Antarmuka DatabaseGateway

```ts
export interface DatabaseGateway {
    query<Row = Record<string, unknown>>(
        statement: string,
        params?: unknown[],
    ): Promise<QueryResult<Row>>;
    execute(
        statement: string,
        params?: unknown[],
    ): Promise<{ affectedRows: number }>;
    transaction<T>(callback: (db: DatabaseGateway) => Promise<T>): Promise<T>;
}
```

### DbDialectHelper

`DbDialectHelper` yang dikontribusikan sebagai `db:dialect` menyediakan dua metode:

```ts
export interface DbDialectHelper {
    upsert(
        table: string,
        keyCol: string,
        keyVal: unknown,
        extraData: Record<string, unknown>,
    ): Promise<void>;
    insertIgnore(table: string, data: Record<string, unknown>): Promise<void>;
}
```

| Path                           | Tujuan                                   |
| ------------------------------ | ---------------------------------------- |
| `src/gateways/db/gateway.ts`   | Antarmuka `DatabaseGateway`              |
| `src/gateways/db/executor.ts`  | `createDbExecutor`                       |
| `src/gateways/db/init.ts`      | `initializeDatabaseSchema`               |
| `src/gateways/db/bootstrap.ts` | Titik masuk bootstrap; `DbDialectHelper` |

## Administrasi

Administrasi hanya menandai adapter yang dipilih oleh `DB_TYPE` sebagai aktif. Setiap adapter database dikunci karena statusnya dikelola oleh profil driver Docker Compose yang dipilih, bukan melalui tombol di aplikasi. Judul gateway database menampilkan kepemilikan ini melalui tooltip informasi.

## Konfigurasi

| Variabel       | Default      | Keterangan                                                   |
| -------------- | ------------ | ------------------------------------------------------------ |
| `DB_TYPE`      | `postgresql` | Backend database: `postgresql` atau `mariadb`                |
| `DATABASE_URL` | —            | String koneksi; diperlukan untuk `postgresql` atau `mariadb` |
