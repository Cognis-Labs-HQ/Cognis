# Adapter Database Memory

## Ikhtisar

Adapter memory adalah implementasi database no-op yang ditujukan untuk pengujian otomatis dan pipeline CI di mana database nyata tidak boleh dilibatkan. Setiap kueri mengembalikan set hasil kosong dan setiap execute adalah no-op yang senyap. Semua pernyataan SQL yang dikeluarkan dicatat dalam `queryLog`, sehingga mudah untuk menegaskan dalam pengujian bahwa SQL yang diharapkan telah dibuat.

Adapter memory tidak boleh pernah digunakan dalam deployment produksi.

## Tanggung Jawab

- Mengimplementasikan antarmuka `DatabaseGateway`: `query`, `execute`, dan `transaction`.
- Mencatat setiap pernyataan SQL dan parameter dalam `queryLog`.
- Mengembalikan set hasil kosong (`[]`) untuk semua panggilan `query()`.
- Tidak melakukan apa pun untuk semua panggilan `execute()`.

## Arsitektur

```ts
const db = new MemoryDatabaseGateway();
await db.execute('INSERT INTO users (id) VALUES (?)', ['u1']);
console.log(db.queryLog);
// [{ sql: 'INSERT INTO users (id) VALUES (?)', params: ['u1'] }]
```

## Konfigurasi

| Variabel | Default | Keterangan |
| -------- | ------- | ---------- |
| `DB_TYPE` | — | Harus `memory` untuk mengaktifkan adapter ini |
