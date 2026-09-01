# Gateway Sosial

## Gambaran Umum

Gateway Sosial mengoordinasikan fitur sosial yang terlihat oleh pengguna:
profil, postingan, grafik sosial, dan pesan pribadi. Gateway ini tidak memiliki
logika database secara langsung. Sebaliknya, gateway menemukan dan mem-bootstrap
adapter di bawah `src/adapters/social/`, dan setiap adapter bertanggung jawab
atas domain yang jelas. Menonaktifkan gateway ini menonaktifkan semua adapter
sosial sekaligus tanpa memengaruhi Auth, Notify, atau gateway lain.

Area fitur sosial baru dapat ditambahkan cukup dengan membuat direktori adapter
baru di bawah `src/adapters/social/`. Tidak diperlukan registrasi pusat.

## Tanggung Jawab

- Menemukan dan mem-bootstrap semua adapter sosial saat server dimulai melalui
  `CoreSocialGateway.bootstrapAdapters()`.
- Menjaga registry adapter yang terdaftar dan mengeksposnya melalui
  `GET /api/v1/gateways/social/adapters` untuk UI administrasi.
- Memberikan `SocialAdapterBootstrapCtx` ke setiap adapter agar adapter dapat
  mendaftarkan route, asset statis, plugin navbar, dan kontribusi capability.
- Menegakkan urutan bootstrap profile-terlebih-dahulu agar `social:profileStore`
  tersedia sebelum adapter Messages berjalan.

Bukan tanggung jawab gateway ini: logika profil, messaging, postingan, atau
penyimpanan file. Semua itu dimiliki adapter masing-masing.

## Arsitektur

### CoreSocialGateway

`src/gateways/social/gateway.ts` mendefinisikan `CoreSocialGateway`. Adapter
mengikuti siklus discovery/bootstrap yang sama seperti Gateway Notification:
`createSocialAdapter()` mendeklarasikan identitas adapter untuk daftar admin dan
status toggle yang dipersist, sedangkan `bootstrapSocialAdapter(ctx)` memasang
route, asset statis, entri navbar, dan capability.

Gateway ini menyediakan metode berikut:

| Metode                         | Keterangan                                       |
| ------------------------------ | ------------------------------------------------ |
| `discoverAdapters(root)`       | Mengimpor factory adapter dan mencatat identitas |
| `loadPersistedConfigs()`       | Memulihkan status aktif/nonaktif yang dipersist  |
| `registerAdapter(adapter)`     | Mencatat adapter yang ditemukan                  |
| `listAdapters()`               | Mengembalikan semua adapter terdaftar untuk API  |
| `enableAdapter(id)`            | Mengaktifkan adapter dan menyimpan statusnya     |
| `disableAdapter(id)`           | Menonaktifkan adapter dan menyimpan statusnya    |
| `bootstrapAdapters(root, ctx)` | Mengimpor dan menjalankan bootstrapper adapter   |

### Siklus Bootstrap Adapter

`discoverAdapters` memindai direktori root yang diberikan, membaca
`package.json` pada setiap subdirektori, mengimpor entry point adapter, lalu
mendaftarkan modul yang mengekspor `createSocialAdapter()`. Setelah konfigurasi
persisten dimuat, `bootstrapAdapters` mengimpor modul yang sama dan memanggil
`bootstrapSocialAdapter` jika tersedia. Kesalahan adapter ditangkap per adapter
dan dicatat di log.

Profile diurutkan pertama agar dapat menyumbangkan `social:profileStore`
sebelum adapter Messages berjalan. Jika Profile tidak ada atau gagal, Messages
tidak menemukan capability tersebut dan melewati fitur yang bergantung pada
profil secara aman.

### SocialAdapterBootstrapCtx

Didefinisikan di `src/gateways/social/gateway.ts` dan diberikan ke setiap
adapter:

| Field                                   | Keterangan                                                   |
| --------------------------------------- | ------------------------------------------------------------ |
| `gateway`                               | Instance `CoreSocialGateway` untuk kontrol gateway           |
| `adapterId`                             | Nama direktori adapter yang sedang di-bootstrap              |
| `adapterRoot`                           | Path absolut ke direktori adapter                            |
| `capabilities`                          | `CapabilityStore` bersama                                    |
| `gatewayRegistry`                       | Registry gateway; disarankan hanya dibaca                    |
| `registerRoute(handler, gwId)`          | Mendaftarkan route HTTP di bawah ID gateway tersebut         |
| `registerStaticDir(prefix, dir)`        | Menyajikan direktori statis di `/static/<prefix>/`           |
| `registerAdapterStaticDir(gw, ad, dir)` | Menyajikan file di `/static/adapters/<gw>/<ad>/`             |
| `registerNavbarPlugin(url, isEnabled?)` | Menambahkan skrip navbar yang aktif bersyarat                |
| `log`                                   | Logger terstruktur opsional                                  |
| `dbExecutor`                            | Executor database dari capability `db:executor`              |
| `dbType`                                | String dialek database                                       |
| `isGatewayEnabled()`                    | Mengembalikan `false` jika Gateway Sosial nonaktif           |
| `isAdapterEnabled(id?)`                 | Mengembalikan `false` jika adapter saat ini/bernama nonaktif |

## Adapter Bawaan

- **Profile** (`src/adapters/social/profile/`) — profil pengguna, grafik sosial,
  postingan, preferensi per pengguna, dan route file.
- **Messages** (`src/adapters/social/messages/`) — pesan pribadi dan chatroom
  dengan isi pesan terenkripsi di sisi server.

## Route API

| Metode | Path                                           | Keterangan               | Auth  |
| ------ | ---------------------------------------------- | ------------------------ | ----- |
| `GET`  | `/api/v1/gateways/social/adapters`             | Daftar adapter terdaftar | Admin |
| `POST` | `/api/v1/gateways/social/adapters/:id/enable`  | Tandai adapter aktif     | Admin |
| `POST` | `/api/v1/gateways/social/adapters/:id/disable` | Tandai adapter nonaktif  | Admin |

## Standar perubahan keanggotaan

Komponen sosial memakai dua verba yang sama untuk perubahan keanggotaan: `POST` menambahkan pengguna dan `DELETE` menghapusnya. Gunakan path kanonis yang terdokumentasi untuk setiap relasi, handle pada batas HTTP, serta ID akun kanonis dalam kapabilitas `ctx`. Kedua operasi harus idempoten. Perubahan berhasil mengembalikan `200`, masukan salah `400`, sumber daya yang tidak ada `404`, dan penolakan `403`.

| Relasi                | Tambah                                                                             | Hapus                                                          | Kapabilitas `ctx`                                                                                                   |
| --------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Anggota ruang obrolan | `POST /api/v1/social/messages/rooms/:roomId/members` dengan `{ "handle": "user" }` | `DELETE /api/v1/social/messages/rooms/:roomId/members/:handle` | `social:messages:membership` dengan `add({ roomId, actorAccountId, userAccountId })` dan `remove(...)` yang sepadan |
| Pengikut profil       | `POST /api/v1/social/users/:handle/follow`                                         | `DELETE /api/v1/social/users/:handle/follow`                   | `social:profile:followers` dengan `add({ followerAccountId, followedAccountId })` dan `remove(...)` yang sepadan    |

`add` adalah operasi idempoten untuk memastikan keanggotaan aktif dan juga membatalkan pengarsipan keanggotaan. Integrasi rapat harus memanggilnya setiap kali peserta bergabung sebelum memuat obrolan, sehingga pengguna yang sengaja keluar dari obrolan dapat bergabung kembali bersama rapat. Keluar dari obrolan tidak menghapus peserta dari rapat.

Rute HTTP mengautentikasi dan mengotorisasi pelaku. Kapabilitas merupakan permukaan antarpeladen tepercaya: pemanggil harus sudah berwenang dan selalu menyertakan pelaku secara eksplisit. Konsumen mendapatkannya hanya dari `ctx.capabilities`.

## Kapabilitas identitas profil

Adapter Profile menerbitkan `social:profile:identity` untuk konsumen platform dan modul. Fungsi `normalizeHandleKey` dan `normalizeHandleKeys` menerapkan aturan normalisasi handle kanonis, sedangkan `resolveAccountHandle(accountId, fieldName?)` mengubah ID akun kanonis menjadi handle profil yang dinormalisasi dan menolak akun atau handle yang tidak ada. Orkestrator menggunakan kapabilitas ini alih-alih mengimpor adapter Profile atau menduplikasi logika normalisasi.
