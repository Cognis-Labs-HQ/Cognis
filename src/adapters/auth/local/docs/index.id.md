# Adapter Autentikasi Lokal

## Ikhtisar

Adapter autentikasi lokal adalah penyimpan kredensial bawaan untuk Cognis. Adapter ini mengelola nama pengguna dan kata sandi yang di-hash dalam database platform sendiri, tanpa memerlukan penyedia identitas eksternal. Adapter lokal selalu diaktifkan dan tidak dapat dinonaktifkan.

## Tanggung Jawab

- Menyimpan dan memverifikasi kredensial yang dikelola secara lokal menggunakan `crypto.scrypt`.
- Menyediakan `register()` untuk pembuatan akun.
- Menyediakan `updateLastLogin()` untuk melacak waktu login terakhir.
- Menyediakan `DbLocalAccountStore` sebagai implementasi `LocalAccountStore`.

## Arsitektur

`DbLocalAccountStore` di `src/adapters/auth/local/store.ts` adalah satu-satunya lapisan persistensi untuk akun pengguna lokal.

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

## Konfigurasi

Tidak ada field yang dapat dikonfigurasi. Manajemen kredensial dilakukan melalui perintah CLI `user:*` atau route API register/login.

Pembersihan identitas eksternal dapat menghapus identitas berdasarkan awalan sumber milik penyedia. Autentikasi ulang memperbarui email, nama tampilan, peran, dan status aktif akun eksternal yang dipertahankan sebelum mengaitkan identitas baru.

## Privasi akun dan isolasi keyring

Akun SSO menggunakan ID acak yang tidak mengungkap identitas penyedia. ID penyedia disimpan terpisah dan hanya ditampilkan kepada administrator; nama pengguna publik tidak memuatnya. Auth mencadangkan nama sebelum perubahan profil atau email: nama duplikat dari penyedia yang sama ditolak, sedangkan penyedia berbeda mendapat akhiran acak pendek bila perlu. Daftar pengguna dan endpoint tindakan membedakan `username` publik dari `accountId` internal.

Akun lokal yang sudah ada tetap berfungsi meskipun ada catatan SSO lama. Startup tidak memerlukan reset basis data. Login dan provisi akun SSO lama ditolak secara individual sampai akun tersebut dibuat ulang dengan ID opak. ID akun, hubungan, dan rapat tidak dimigrasikan atau dihapus secara otomatis.
