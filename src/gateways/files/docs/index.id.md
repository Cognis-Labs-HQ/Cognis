# Gateway Penyimpanan File

## Ikhtisar

Gateway Penyimpanan File menyediakan antarmuka seragam bagi platform untuk membaca, menulis, dan menambahkan konten ke file. Gateway ini mem-bootstrap adapter file lokal dan berkontribusi empat capability ke capability store, sehingga gateway lain — gateway profil untuk upload avatar dan gateway logging untuk penulisan log — dapat mengakses operasi file tanpa perlu mengetahui backend yang digunakan.

## Tanggung Jawab

- Menginstansiasi `LocalFileGateway` dengan root penyimpanan dari `MEDIA_LOCATION`.
- Berkontribusi `file:gateway`, `file:write`, `file:read`, dan `file:append` ke capability store.
- Mendaftarkan gateway `files` di registry gateway.

## Arsitektur

### Capability yang Disediakan

| Capability | Tipe | Keterangan |
| ---------- | ---- | ---------- |
| `file:gateway` | `FileStorageGateway` | Instance gateway lengkap |
| `file:write` | `(filePath, content) => Promise<void>` | Menimpa file |
| `file:read` | `(filePath) => Promise<Buffer \| null>` | Membaca file |
| `file:append` | `(filePath, content) => Promise<void>` | Menambahkan teks ke file (digunakan oleh gateway logging) |

## Konfigurasi

| Variabel | Default | Keterangan |
| -------- | ------- | ---------- |
| `MEDIA_LOCATION` | `/app/media` | Direktori root untuk penyimpanan media; upload disimpan di `$MEDIA_LOCATION/uploads` |
