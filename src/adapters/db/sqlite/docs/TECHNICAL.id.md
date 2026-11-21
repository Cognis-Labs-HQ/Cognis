# Referensi Teknis

Antarmuka publik dan aturan operasional SQLite.

## Antarmuka

`SqliteDbGateway(client)` menerapkan DatabaseGateway. SqliteClient menyediakan all(statement, params), run(statement, params) dengan changes, dan exec(statement). Perintah terstruktur memakai placeholder serta konflik SQLite.

## Konfigurasi

Runtime penyemat membuat klien dan jalur berkas. Adapter tidak mendeklarasikan SQLITE_PATH atau factory executor standar; DB_TYPE=sqlite saja tidak memilihnya pada server bawaan.

## Perilaku

### Ikhtisar

Adapter SQLite menyediakan gateway database ringan untuk deployment berbasis SQLite, pengembangan lokal, dan pengujian yang membutuhkan penyimpanan relasional tertanam.

### Tanggung Jawab

- Mengimplementasikan antarmuka `DatabaseGateway` melalui `SqliteDbGateway`.
- Menjalankan kueri, perintah, dan transaksi terhadap klien SQLite yang disediakan.
- Mendukung perintah database terstruktur dengan sintaks placeholder dan konflik SQLite.
- Menyediakan helper skema auth khusus SQLite serta skrip inisialisasi dan migrasi SQL.

## Keamanan

Ikat data sebagai parameter dan lindungi berkas serta cadangan dengan izin sistem. Otorisasi aplikasi berjalan sebelum adapter.

## Referensi

- [src/adapters/db/sqlite/manifest.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/1dcd65eaa5b187007735ca3b527b797758aae884/src/adapters/db/sqlite/manifest.json)
- [src/adapters/db/sqlite/package.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/1dcd65eaa5b187007735ca3b527b797758aae884/src/adapters/db/sqlite/package.json)
- [src/adapters/db/sqlite/index.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/1dcd65eaa5b187007735ca3b527b797758aae884/src/adapters/db/sqlite/index.ts)
