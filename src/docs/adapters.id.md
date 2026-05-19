# Adapter

## Ikhtisar

`src/adapters/` berisi semua implementasi spesifik penyedia dari antarmuka gateway. Adapter adalah kelas konkret yang mengimplementasikan kontrak yang didefinisikan di `src/core/` atau gateway. Mengganti backend database berarti mengubah `DB_TYPE` di environment; tidak ada kode aplikasi di luar gateway yang berubah.

Setiap adapter berada di bawah `src/adapters/<gateway-id>/<adapter-id>/` dan membawa `package.json`, tes, dan dokumentasinya sendiri. Gateway yang memiliki menemukan adapter dengan memindai direktori tersebut saat startup.

## Tanggung Jawab

- Mengimplementasikan antarmuka gateway untuk penyedia eksternal tertentu.
- Mengelola detail koneksi spesifik penyedia, dialek SQL, dan penanganan error secara internal.
- Membawa SQL inisialisasi skema sendiri (untuk adapter DB).
- Membawa tes, dokumentasi, dan manifes versi sendiri.

## Arsitektur

```
src/adapters/
  db/
    mariadb/     — MariaDB/MySQL
    postgres/    — PostgreSQL (default)
    memory/      — In-memory (hanya pengujian)
  auth/
    local/       — Kredensial lokal dengan hashing scrypt
    ldap/        — Autentikasi direktori LDAP
    saml/        — SSO SAML 2.0
    oidc/        — SSO OAuth2/OIDC
  notify/
    smtp/        — Pengiriman email via SMTP
  file/
    local/       — Penyimpanan file berbasis filesystem
```

## Titik Ekstensi

Untuk menambahkan adapter baru untuk gateway yang ada, buat direktori di bawah `src/adapters/<gateway-id>/<adapter-id>/` berisi:

- Implementasi adapter (kelas TypeScript yang mengimplementasikan antarmuka gateway).
- `package.json` dengan `name`, `version`, dan field `main`.
- Fungsi `createAdapter()` yang diekspor.
- `docs/index.en.md` mengikuti standar dokumentasi.
- Tes di bawah `tests/`.
