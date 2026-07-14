# Adapter Penyimpanan File Lokal

## Ikhtisar

Adapter file lokal menyimpan file yang diunggah di filesystem lokal server. Ini adalah satu-satunya adapter penyimpanan file di platform saat ini, dan manifestnya mengandung `"locked": true`, yang berarti tidak dapat dinonaktifkan atau diganti melalui UI. Implementasi penyimpanan cloud di masa depan (S3, GCS, Azure Blob) akan menjadi pengganti drop-in untuk adapter ini.

Adapter ini berbasis namespace: setiap operasi mengambil `namespaceId` terlebih dahulu, dan penyimpanan fisik berakar pada `{storageRoot}/{namespaceId}/...`, sehingga file dari namespace yang berbeda tidak akan pernah bertabrakan di disk.

## Tanggung Jawab

- Mengimplementasikan antarmuka `FileStorageGateway` berbasis namespace: `put`, `store`, `get`, `delete`, dan `list`, masing-masing dengan namespace terlebih dahulu.
- Menurunkan ekstensi file yang stabil dari tipe MIME setiap file yang diunggah.
- Membuat nama file berbasis UUID untuk file yang disimpan melalui `store()`.
- Membatasi file yang disimpan ke kunci `{namespaceId}/{actorId}/{uuid}.{ext}`.

## Arsitektur

### Pemetaan MIME ke Ekstensi

| Tipe MIME    | Ekstensi |
| ------------ | -------- |
| `image/jpeg` | `jpg`    |
| `image/png`  | `png`    |
| `image/webp` | `webp`   |
| `image/gif`  | `gif`    |

File dengan tipe MIME yang tidak ada dalam pemetaan ini disimpan dengan ekstensi `.bin`.

## Konfigurasi

| Variabel         | Default      | Keterangan                                                               |
| ---------------- | ------------ | ------------------------------------------------------------------------ |
| `MEDIA_LOCATION` | `/app/media` | Direktori root untuk media; upload disimpan di `$MEDIA_LOCATION/uploads` |
