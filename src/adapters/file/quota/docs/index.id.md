# Adapter Kuota File

## Ikhtisar

Adapter kuota file adalah penyimpanan kebijakan berbasis basis data yang dikonsultasikan secara internal oleh gateway file sebelum setiap penulisan. Ia memiliki dua hal: kuota default yang dapat disesuaikan admin (per namespace, ditambah satu default global di seluruh namespace) dan snapshot kuota per-pengguna yang diambil dari default tersebut pada waktu pembuatan akun. Ia **tidak** melacak berapa banyak penyimpanan yang benar-benar telah digunakan pengguna — akuntansi penggunaan berada di tabel metadata objek file milik gateway file sendiri, karena secara alami berkolokasi dengan data ukuran per-objek.

## Tanggung Jawab

- Menyimpan kuota default per namespace yang terdaftar, yang dibuat secara lambat saat admin pertama kali melihat daftar default namespace (`ensureNamespaceDefault`).
- Menyimpan satu kuota default global di seluruh namespace.
- Snapshot default saat ini ke dalam baris override per-pengguna pada waktu pembuatan akun (`provisionUser`), sehingga kuota pengguna mencerminkan apa yang berlaku saat mereka mendaftar, bukan berubah seiring perubahan admin selanjutnya.
- Mengizinkan admin untuk mengedit kuota per-namespace atau global pengguna setelah penyediaan.

Tidak bertanggung jawab atas: akuntansi penggunaan (dilakukan oleh `DbFileObjectStore` milik gateway file) atau penegakan kuota (`NamespaceFileService` milik gateway file membandingkan penggunaan dengan nilai-nilai ini sebelum setiap penulisan).

## Arsitektur

`DbFileQuotaStore` di `src/adapters/file/quota/index.ts` mengimplementasikan kontrak `FileQuotaStore` (`src/gateways/files/reuse/quota-store-contract.ts`) terhadap empat tabel:

| Tabel                           | Tujuan                                                      |
| ------------------------------- | ----------------------------------------------------------- |
| `file_namespace_quota_defaults` | Kuota default per id namespace yang dapat disesuaikan admin |
| `file_global_quota_default`     | Default global satu baris (id `"global"`)                   |
| `file_user_namespace_quotas`    | Override kuota per-pengguna, per-namespace                  |
| `file_user_global_quotas`       | Override kuota global per-pengguna                          |

Konstanta fallback bawaan berlaku ketika belum pernah ada default yang ditetapkan: `1 GiB` per namespace, `5 GiB` secara global.

### Inisialisasi skema secara lambat

Seperti gateway file itu sendiri, adapter ini melakukan bootstrap sebelum gateway basis data dijamin siap (lihat urutan tetap `GatewayService.bootstrap()`). Pembuatan skema (`ensureSchema()`) oleh karena itu ditunda hingga panggilan nyata pertama dan disimpan dalam memori, alih-alih dijalankan segera saat bootstrap.

### Penyediaan bersifat idempoten

`provisionUser(username)` menyisipkan satu baris per namespace yang terdaftar ditambah satu baris global, menggunakan `conflict: { action: "ignore" }` sehingga memanggilnya berulang kali (misalnya pada setiap login, bukan hanya pendaftaran pertama) tidak pernah menimpa override yang sudah ada.

## Konfigurasi

Adapter ini tidak memiliki konfigurasi variabel lingkungan; kuota default diatur melalui rute admin gateway file (`/api/v1/files/admin/namespace-defaults`, `/api/v1/files/admin/global-default`) alih-alih variabel lingkungan, sehingga dapat diubah saat runtime tanpa perlu restart.
