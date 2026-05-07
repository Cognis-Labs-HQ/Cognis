# Profil

## Ikhtisar

Fitur profil memberikan setiap akun identitas publik, grafik sosial, aliran postingan bergaya microblog, dan kemampuan upload file. Fitur ini diimplementasikan sebagai gateway profil.

Visibilitas adalah perhatian utama. Setiap akun memilih tingkat visibilitas yang mengatur siapa yang dapat melihat profil, jumlah sosial, dan postingan mereka. Akun yang diblokir menerima respons 404 pada endpoint mana pun yang menargetkan pemblokir.

## Tanggung Jawab

- Memiliki tabel database `account_profiles`, `account_follows`, `account_blocks`, `posts`, dan `file_size_limits`.
- Menegakkan visibilitas tingkat akun dan postingan pada semua endpoint profil dan konten.
- Mengelola upload avatar dan banner melalui gateway file.
- Memelihara grafik sosial: follow, unfollow, block, unblock.

## Arsitektur

### Model Visibilitas

| Tingkat | Profil terlihat oleh | Postingan dan jumlah terlihat oleh |
| ------- | -------------------- | ---------------------------------- |
| `hidden` (default) | Diri sendiri dan admin saja | — (posting diblokir; mengembalikan 403) |
| `private` | Hanya follower yang sudah ada | Hanya follower |
| `friends` | Semua pengguna terautentikasi | Hanya follower |
| `community` | Semua pengguna terautentikasi | Semua pengguna terautentikasi |

### Struktur Halaman Frontend

| Elemen | Default terlihat | Ukuran grid |
| ------ | ---------------- | ----------- |
| `hero` | Ya | full |
| `followers` | Ya | `[2, 3]` |
| `following` | Ya | `[2, 3]` |
| `posts` | Ya | full |
| `social-links` | Tidak | `[2, 3]` |
