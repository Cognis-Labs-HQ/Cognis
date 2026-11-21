# Referensi Teknis

Antarmuka publik dan aturan operasional Penyimpanan Berkas Lokal.

## Antarmuka

Penyimpanan Berkas Lokal terintegrasi melalui gerbang pemilik; manifesnya mengidentifikasi komponen dan dependensi yang diperlukan.

## Konfigurasi

### Konfigurasi

| Variabel         | Default      | Keterangan                                                               |
| ---------------- | ------------ | ------------------------------------------------------------------------ |
| `MEDIA_LOCATION` | `/app/media` | Direktori root untuk media; upload disimpan di `$MEDIA_LOCATION/uploads` |

## Perilaku

### Ikhtisar

Adapter file lokal menyimpan file yang diunggah di filesystem lokal server. Ini adalah satu-satunya adapter penyimpanan file di platform saat ini, dan manifestnya mengandung `"locked": true`, yang berarti tidak dapat dinonaktifkan atau diganti melalui UI. Implementasi penyimpanan cloud di masa depan (S3, GCS, Azure Blob) akan menjadi pengganti drop-in untuk adapter ini.

Adapter ini berbasis namespace: setiap operasi mengambil `namespaceId` terlebih dahulu, dan penyimpanan fisik berakar pada `{storageRoot}/{namespaceId}/...`, sehingga file dari namespace yang berbeda tidak akan pernah bertabrakan di disk.

### Tanggung Jawab

- Mengimplementasikan antarmuka `FileStorageGateway` berbasis namespace: `put`, `store`, `get`, `delete`, dan `list`, masing-masing dengan namespace terlebih dahulu.
- Menurunkan ekstensi file yang stabil dari tipe MIME setiap file yang diunggah.
- Membuat nama file berbasis UUID untuk file yang disimpan melalui `store()`.
- Membatasi file yang disimpan ke kunci `{namespaceId}/{actorId}/{uuid}.{ext}`.

- Menyajikan file dari `$MEDIA_LOCATION/uploads` di filesystem lokal.

Tidak bertanggung jawab untuk: menyajikan file melalui HTTP (rute gateway files yang melakukannya), atau menegakkan ACL dan kuota (gateway files `NamespaceFileService` memeriksanya sebelum memanggil adapter).

### Isolasi namespace dan key

`store(namespaceId, actorId, content, contentType)` menghasilkan `uuid` dan menulis ke `{namespaceId}/{actorId}/{uuid}.{ext}`; `put(namespaceId, key, content, contentType)` menulis ke `${storageRoot}/${namespaceId}/${key}` dan membuat direktori perantara. Helper privat `namespaceRoot(namespaceId)` menentukan root per namespace yang digunakan setiap metode.

### Pemetaan MIME ke Ekstensi

| Tipe MIME    | Ekstensi |
| ------------ | -------- |
| `image/jpeg` | `jpg`    |
| `image/png`  | `png`    |
| `image/webp` | `webp`   |
| `image/gif`  | `gif`    |

File dengan tipe MIME yang tidak ada dalam pemetaan ini disimpan dengan ekstensi `.bin`.

## Keamanan

Validasi namespace dan kunci mencegah traversal jalur; penulisan berada di bawah uploads. Gateway Files memeriksa ACL serta kuota sebelum adapter penyimpanan.

## Referensi

- [src/adapters/file/local/manifest.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/file/local/manifest.json)
- [src/adapters/file/local/package.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/file/local/package.json)
- [src/adapters/file/local/index.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/file/local/index.ts)
