# Adapter Keyring Terenkripsi

## Ringkasan

Adapter Keyring Terenkripsi menyimpan brankas buram yang dienkripsi di peramban untuk akun terautentikasi. Adapter Autentikasi ini wajib agar kata sandi, kunci enkripsi, dan rahasia khusus pengguna tersedia melalui satu kapabilitas stabil tanpa bergantung pada penyedia masuk.

Antarmuka peramban tetap berada di `src/adapters/auth/keyring/ui/keyring.js`. Enkripsi dan dekripsi berlangsung di peramban; adapter tidak pernah menerima rahasia teks biasa.

## Tanggung Jawab

- Memulai penyimpanan brankas melalui kapabilitas `db:executor`.
- Menyumbangkan pabrik rute dan kapabilitas penyimpanan melalui `ctx`.
- Menyimpan dan mengembalikan amplop brankas buram yang tervalidasi.

Tidak bertanggung jawab atas: autentikasi pengguna, penurunan kunci, atau penafsiran rahasia tersimpan.

## Arsitektur

`src/adapters/auth/keyring/index.ts` ditemukan Gateway Autentikasi dan menyumbangkan `auth:keyringVaultStore` serta `auth:keyringRouteFactory`. Gateway memasok konteks rutenya ke pabrik sehingga pemeriksaan autentikasi tetap diinjeksi. `src/adapters/auth/keyring/store.ts` mengakses persistensi hanya melalui kapabilitas eksekutor basis data.

## Konfigurasi

Adapter wajib ini tidak memiliki bidang konfigurasi dan menggunakan penyedia `db:executor` aktif.

## Rute API

| Metode | Jalur                  | Deskripsi                         | Autentikasi |
| ------ | ---------------------- | --------------------------------- | ----------- |
| GET    | `/api/v1/auth/keyring` | Membaca brankas terenkripsi akun. | Pengguna    |
| PUT    | `/api/v1/auth/keyring` | Mengganti brankas terenkripsi.    | Pengguna    |
| DELETE | `/api/v1/auth/keyring` | Menghapus brankas terenkripsi.    | Pengguna    |
