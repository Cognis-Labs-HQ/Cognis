# Referensi Teknis

Antarmuka publik dan aturan operasional Akun Lokal.

## Antarmuka

### Arsitektur

`DbLocalAccountStore` di `src/adapters/auth/local/store.ts` adalah satu-satunya lapisan persistensi untuk akun pengguna lokal.

## Konfigurasi

### Konfigurasi

Tidak ada field yang dapat dikonfigurasi. Manajemen kredensial dilakukan melalui perintah CLI `user:*` atau route API register/login.

Pembersihan identitas eksternal dapat menghapus identitas berdasarkan awalan sumber milik penyedia. Autentikasi ulang memperbarui email, nama tampilan, peran, dan status aktif akun eksternal yang dipertahankan sebelum mengaitkan identitas baru.

## Perilaku

### Ikhtisar

Adapter autentikasi lokal adalah penyimpan kredensial bawaan untuk Cognis. Adapter ini mengelola nama pengguna dan kata sandi yang di-hash dalam database platform sendiri, tanpa memerlukan penyedia identitas eksternal. Adapter lokal selalu diaktifkan dan tidak dapat dinonaktifkan.

### Tanggung Jawab

- Menyimpan dan memverifikasi kredensial yang dikelola secara lokal menggunakan `crypto.scrypt`.
- Menyediakan `register()` untuk pembuatan akun.
- Menyediakan `updateLastLogin()` untuk melacak waktu login terakhir.
- Menyediakan `DbLocalAccountStore` sebagai implementasi `LocalAccountStore`.

### Hashing Kata Sandi

Kata sandi di-hash menggunakan Node.js `crypto.scrypt` dengan salt acak 16 byte. Format yang disimpan:

```
scrypt:<hex-salt>:<hex-derived-key>
```

### Manajemen CLI

Akun lokal dikelola melalui CLI `cognisctl` menggunakan namespace perintah `user:*`:

| Perintah            | Keterangan                                   |
| ------------------- | -------------------------------------------- |
| `user:create`       | Membuat akun lokal baru                      |
| `user:role`         | Menetapkan peran ke akun                     |
| `user:set-password` | Mengubah kata sandi akun                     |
| `user:disable`      | Menonaktifkan akun                           |
| `user:enable`       | Mengaktifkan kembali akun yang dinonaktifkan |
| `user:delete`       | Menghapus akun                               |

## Keamanan

Kata sandi lokal memakai scrypt dengan salt acak dan pemeriksaan aman waktu. Pengelolaan akun memerlukan otorisasi Auth; adapter memeriksa kredensial, bukan menerbitkan sesi atau memberikan admin dari masukan pendaftaran.

## Referensi

- [src/adapters/auth/local/manifest.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/1dcd65eaa5b187007735ca3b527b797758aae884/src/adapters/auth/local/manifest.json)
- [src/adapters/auth/local/package.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/1dcd65eaa5b187007735ca3b527b797758aae884/src/adapters/auth/local/package.json)
- [src/adapters/auth/local/index.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/1dcd65eaa5b187007735ca3b527b797758aae884/src/adapters/auth/local/index.ts)
