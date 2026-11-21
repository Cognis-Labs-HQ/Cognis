# Referensi Teknis

Pengganti basis data untuk pengujian yang mencatat panggilan tanpa menjalankan SQL.

## Antarmuka

`MemoryDatabaseGateway` menerapkan query, execute, transaction, dan getQueries di `src/adapters/db/memory/index.ts`. getQueries memberi rekaman readonly dengan statement dan params opsional.

## Konfigurasi

Buat kelas dalam harness uji. Kelas tidak mengekspor canHandleDbProvider atau createDbExecutor; DB_TYPE=memory tidak menghubungkannya ke pemuat standar.

## Perilaku

query mencatat panggilan dan memberi `{ rows: [], rowCount: 0 }`. execute memberi `{ affectedRows: 0 }`. transaction menjalankan callback dengan instans sama tanpa BEGIN, rollback, atau baris tersimpan.

## Keamanan

Parameter terekam dapat berisi rahasia uji. Gunakan nilai sintetis; pengganti ini tidak memberi autentikasi atau otorisasi SQL.

## Referensi

Gunakan penyedia nyata untuk persistensi, batasan, dan isolasi. Lihat [Basis Data](/docs/gateways/db/technical).
