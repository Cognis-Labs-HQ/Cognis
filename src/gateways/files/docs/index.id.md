# Gateway Penyimpanan File

## Ikhtisar

Gateway Penyimpanan File menyediakan platform dengan antarmuka **berbasis namespace** yang seragam untuk menyimpan dan mengambil file. Setiap operasi file dibatasi pada satu namespace — area konten terisolasi yang biasanya dimiliki oleh satu komponen (`profile`, `chats`, `classes`) ditambah dua namespace bawaan yang dimiliki oleh inti (`default`, `user`). Namespace membawa batas ACL dan kuota penyimpanan opsional, sehingga gateway dapat mendukung segala jenis unggahan — dokumen pribadi pengguna, lampiran ruang obrolan, avatar/banner profil, materi kelas — dari satu titik penegakan alih-alih setiap komponen menciptakan kembali kontrol akses dan pemeriksaan kuota.

Gateway ini selalu diaktifkan (`required: true` pada manifestnya) dan tidak mendukung pertukaran adapter saat runtime. Adapter file lokal adalah satu-satunya implementasi penyimpanan konkret saat ini, tetapi antarmuka `FileStorageGateway` didefinisikan di `src/core/contracts/files-gateway.ts` sehingga implementasi alternatif dapat ditambahkan tanpa mengubah bootstrap gateway atau konsumen mana pun.

## Tanggung Jawab

- Membuat instance `LocalFileGateway` dengan root penyimpanan yang berasal dari `MEDIA_LOCATION`.
- Memiliki `NamespaceRegistry`, menerima registrasi namespace dari komponen mana pun melalui kapabilitas `files:registerNamespace`.
- Menegakkan batas ACL setiap namespace pada setiap penulisan, dan ACL per-objek pada setiap pembacaan/penghapusan.
- Menegakkan kuota penyimpanan per-namespace dan global (melalui adapter kuota) sebelum setiap penulisan.
- Menyediakan kapabilitas `files:*` berbasis namespace dan rute HTTP berbasis namespace.
- Mempertahankan kapabilitas lama non-namespace `file:write`/`file:read`/`file:append` yang hanya digunakan oleh gateway logging untuk penulisan log terstruktur (bukan konten pengguna).

Tidak bertanggung jawab atas: menentukan tempat file disimpan secara fisik (urusan adapter), atau menafsirkan arti entri `groupIds` (id kumpulan kolaborator buram yang dipilih oleh komponen pemilik — id ruang obrolan, id kelas, dll.).

## Arsitektur

### Namespace

Sebuah namespace didaftarkan sekali oleh komponen pemiliknya melalui kapabilitas `files:registerNamespace`:

```ts
ctx.capabilities.get("files:registerNamespace")?.({
    id: "profile",
    ownerComponent: "social-profile",
    acl: { visibility: "component-managed" },
    allowComponents: ["some-other-component"], // opsional, "core" selalu diizinkan
});
```

Registrasi hanya sekali; id duplikat akan menyebabkan error. Namespace bawaan (didaftarkan oleh gateway ini sendiri, saat bootstrap-nya sendiri):

| Namespace | Pemilik | Visibilitas       | Tujuan                                                       |
| --------- | ------- | ----------------- | ------------------------------------------------------------ |
| `default` | core    | component-managed | Konten milik aplikasi/sistem (logo, dokumen yang dihasilkan) |
| `user`    | core    | private-owner     | Repositori pribadi per-pengguna yang sangat privat           |

Namespace yang didaftarkan oleh komponen:

| Namespace | Pemilik         | Visibilitas       | Tujuan                            |
| --------- | --------------- | ----------------- | --------------------------------- |
| `profile` | social-profile  | component-managed | Avatar/banner — dapat dibaca luas |
| `chats`   | social-messages | private-group     | Lampiran/avatar ruang obrolan     |
| `classes` | study-classes   | private-group     | Materi kelas                      |

### Model ACL

Setiap namespace mendeklarasikan batas `visibility` yang membatasi setiap objek yang ditulis ke dalamnya:

- **`private-owner`** — objek hanya terlihat oleh pemiliknya, tanpa kecuali. `groupIds`/`publicRead` ditolak sepenuhnya saat penulisan.
- **`private-group`** — pemilik, atau aktor mana pun yang tercantum dalam `groupIds` objek, dapat mengaksesnya. `publicRead` ditolak.
- **`component-managed`** — pemilik, anggota grup, atau (jika `publicRead: true`) siapa pun dapat mengaksesnya. Tingkat paling tidak restriktif.

Setiap penulisan juga membawa ACL per-objek (`ownerId`, opsional `groupIds`, opsional `publicRead`) yang ditetapkan oleh komponen pemanggil. Gateway menolak ACL objek mana pun yang mengklaim akses lebih luas daripada yang diizinkan oleh batas namespace-nya (`AclCeilingViolationError`, HTTP 400) — sebuah objek tidak pernah bisa lebih terbuka daripada yang diizinkan namespace-nya.

### Kuota

Adapter kuota terpisah (`src/adapters/file/quota/`) melacak:

- Kuota default per namespace yang dapat disesuaikan admin, ditambah satu kuota default global di seluruh namespace.
- Snapshot kuota per-pengguna, diambil dari default saat ini pada waktu pembuatan akun (`files:quota:provisionUser`) sehingga kuota pengguna mencerminkan apa yang berlaku saat mereka mendaftar; admin dapat mengedit kuota pengguna setelahnya.

Penggunaan dilacak secara bertahap dalam tabel metadata objek file (`file_objects`) alih-alih dipindai ulang pada setiap penulisan. Penulisan yang akan mendorong penggunaan per-namespace atau global melebihi kuota akan ditolak dengan `QuotaExceededError` (HTTP 413).

### Kapabilitas yang disediakan

| Kapabilitas                            | Deskripsi                                                                |
| -------------------------------------- | ------------------------------------------------------------------------ |
| `files:registerNamespace`              | Registrasi namespace satu kali (error pada id duplikat)                  |
| `files:namespace`                      | Membuat klien terikat namespace untuk sebuah komponen                    |
| `files:put`                            | Menulis ke kunci eksplisit relatif-namespace                             |
| `files:store`                          | Menulis dengan kunci berbasis UUID yang dihasilkan di bawah `{actorId}/` |
| `files:get`                            | Membaca, tunduk pada ACL                                                 |
| `files:delete`                         | Menghapus, tunduk pada ACL                                               |
| `files:list`                           | Mendaftar objek dalam namespace, difilter berdasarkan akses pemanggil    |
| `files:quota:provisionUser`            | Snapshot default kuota namespace/global saat ini untuk pengguna (baru)   |
| `file:write`/`file:read`/`file:append` | Lama, non-namespace — hanya gateway logging                              |

Komponen sebaiknya menggunakan `files:namespace` untuk operasi file rutin melalui `ctx`: ikat `namespaceId` dan `callerComponent` sekali saat bootstrap, lalu panggil klien yang dikembalikan dengan aktor, kunci, konten, dan opsi ACL untuk tiap operasi. Kapabilitas tingkat rendah `files:put`/`files:store`/`files:get`/`files:delete`/`files:list` tetap tersedia ketika pemanggil benar-benar perlu memilih namespace secara dinamis. Semua kapabilitas berbasis namespace mengambil `FileAccessContext` (`actorId`, `callerComponent`, opsional `role`) sehingga gateway dapat memeriksa daftar izin lintas-komponen namespace (`"core"` selalu diizinkan) selain ACL per-objek.

### Rute HTTP

- `PUT/GET/DELETE /api/v1/files/:namespace/*key` — operasi file generik berbasis namespace; memerlukan autentikasi, identitas aktor berasal dari sesi.
- `GET /api/v1/files/:namespace` — daftar.
- `GET/PUT /api/v1/files/admin/namespace-defaults[/:namespaceId]`, `PUT /api/v1/files/admin/global-default`, `GET /api/v1/files/admin/users/:username/quotas`, `PUT /api/v1/files/admin/users/:username/quotas/:namespaceId` — administrasi kuota khusus admin (`namespaceId: "global"` menargetkan kuota global pengguna).

### Batasan urutan bootstrap

`GatewayService.bootstrap()` selalu melakukan bootstrap gateway file sebelum gateway basis data. Akibatnya, gateway file tidak dapat mengasumsikan `db:executor` tersedia pada waktu bootstrap-nya sendiri — pembuatan skema berbasis basis data (metadata objek file, tabel kuota) ditunda hingga panggilan nyata pertama alih-alih dijalankan segera.

## Konfigurasi

| Variabel         | Default      | Deskripsi                                                                                           |
| ---------------- | ------------ | --------------------------------------------------------------------------------------------------- |
| `MEDIA_LOCATION` | `/app/media` | Direktori root untuk penyimpanan media; unggahan masuk ke `$MEDIA_LOCATION/uploads/<namespace>/...` |
