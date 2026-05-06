# Gateway Profil

## Ikhtisar

Gateway Profil memiliki profil pengguna, grafik sosial, postingan, dan manajemen file untuk upload avatar dan banner. Gateway ini memberikan identitas publik kepada setiap akun Cognis dan tempat dalam grafik komunitas. Menghapus gateway ini menghapus semua fitur profil, sosial, postingan, dan file dari platform tanpa mempengaruhi inti, autentikasi, atau gateway lainnya.

## Tanggung Jawab

- Memiliki dan menginisialisasi tabel database `account_profiles`, `account_follows`, `account_blocks`, `posts`, dan `file_size_limits`.
- Menegakkan visibilitas tingkat akun dan postingan pada semua endpoint profil dan sosial.
- Mengelola grafik sosial: follow, unfollow, block, unblock, dan query daftar follower/following.
- Mengelola upload avatar dan banner melalui capability `file:gateway`.
- Berkontribusi `profile:createProfile`, `profile:setRoleByHandle`, dan `preferences:store` ke capability store.

## Arsitektur

### Model Visibilitas

| Tingkat | Profil terlihat oleh | Postingan dan jumlah terlihat oleh |
| ------- | -------------------- | ---------------------------------- |
| `hidden` (default) | Diri sendiri dan admin saja | — (postingan mengembalikan 403) |
| `private` | Hanya follower yang sudah ada | Hanya follower |
| `friends` | Semua pengguna terautentikasi | Hanya follower |
| `community` | Semua pengguna terautentikasi | Semua pengguna terautentikasi |

### Lokasi Sumber Utama

| Path | Tujuan |
| ---- | ------ |
| `src/gateways/profile/bootstrap.ts` | Titik masuk bootstrap |
| `src/gateways/profile/routes/social.ts` | Route follow, block, follower |
| `src/gateways/profile/routes/posts.ts` | Pembuatan, daftar, dan penghapusan postingan |
| `src/adapters/db/reuse/profile-store.ts` | `DbProfileStore` — semua operasi SQL profil |
