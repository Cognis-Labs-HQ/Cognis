# Gateway Profil

## Ikhtisar

Gateway Profil memiliki profil pengguna, grafik sosial, postingan, dan manajemen file untuk upload avatar dan banner. Gateway ini memberikan identitas publik kepada setiap akun Cognis dan tempat dalam grafik komunitas. Menghapus gateway ini menghapus semua fitur profil, sosial, postingan, dan file dari platform tanpa mempengaruhi inti, autentikasi, atau gateway lainnya.

## Tanggung Jawab

- Memiliki dan menginisialisasi tabel database `account_profiles`, `account_follows`, `account_blocks`, `posts`.
- Menegakkan visibilitas tingkat akun dan postingan pada semua endpoint profil dan sosial.
- Mengelola grafik sosial: follow, unfollow, block, unblock, dan query daftar follower/following.
- Mengelola upload avatar dan banner melalui capability `file:gateway`.
- Berkontribusi `profile:createProfile`, `profile:setRoleByHandle`, dan `preferences:store` ke capability store.

## Arsitektur

### Model Visibilitas

| Tingkat            | Profil terlihat oleh          | Postingan dan jumlah terlihat oleh |
| ------------------ | ----------------------------- | ---------------------------------- |
| `hidden` (default) | Diri sendiri dan admin saja   | — (postingan mengembalikan 403)    |
| `private`          | Hanya follower yang sudah ada | Hanya follower                     |
| `friends`          | Semua pengguna terautentikasi | Hanya follower                     |
| `community`        | Semua pengguna terautentikasi | Semua pengguna terautentikasi      |

### Lokasi Sumber Utama

| Path                                     | Tujuan                                       |
| ---------------------------------------- | -------------------------------------------- |
| `src/gateways/profile/bootstrap.ts`      | Titik masuk bootstrap                        |
| `src/gateways/profile/routes/social.ts`  | Route follow, block, follower                |
| `src/gateways/profile/routes/posts.ts`   | Pembuatan, daftar, dan penghapusan postingan |
| `src/adapters/db/reuse/profile-store.ts` | `DbProfileStore` — semua operasi SQL profil  |

## Pembaruan profil langsung

Informasi profil yang disimpan langsung ditampilkan. Jumlah dan kartu pengguna pengikut serta yang diikuti diperbarui secara otomatis. Pemilih gambar profil hanya menerima satu pilihan atau unggahan aktif pada satu waktu.

Perubahan mengikuti dan pilihan tinggi banner langsung ditampilkan sementara sinkronisasi latar belakang diselesaikan.

Umpan balik tindakan pesan dimuat dari sumber bahasa milik profil sehingga perenderan profil tidak bergantung pada adapter Pesan yang aktif.

## Ketersediaan

Menu profil menampilkan ketersediaan saat ini dan memungkinkan pengguna yang masuk memilih Luang, Sibuk, atau Tentatif. Lampu status avatar menampilkan status yang ditentukan sebagai keterangan saat penunjuk diarahkan. Komponen lain dapat meminta status pengguna yang mempertimbangkan kalender berdasarkan ID akun melalui kapabilitas ctx `social:getUserAvailability`.

## Kapabilitas UI yang disediakan

Plugin navbar profil menyediakan `ui:profileAvatarRenderer`. Modul yang merender avatar profil harus menyatakan ID ini dalam `requiresCapabilities`; Cognis kemudian memuat penyedia sebelum memasang rute SPA modul.

### Kapabilitas klien browser

`social:profileUiClient` dikontribusikan oleh penyedia navbar Profil dan menyediakan `getCurrentProfile()` agar modul browser memperoleh data profil melalui klien adaptor pemilik.
