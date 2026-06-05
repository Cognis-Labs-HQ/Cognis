# API

## Ikhtisar

`src/api/` adalah lapisan HTTP Cognis. Di sini terdapat server Node.js yang kompatibel dengan Express, registry route, middleware autentikasi, dan semua modul route handler tipis yang memetakan permintaan HTTP ke operasi gateway. Lapisan API sengaja dijaga tipis: route handler mengurai dan memvalidasi input, mendelegasikan ke gateway, dan mengembalikan amplop respons yang stabil.

Server dirakit dari apa yang ada saat startup, bukan dari daftar komponen yang dikodekan secara keras. Gateway mendaftarkan route mereka sendiri selama bootstrap melalui `ctx.routeRegistry.register(...)`.

## Tanggung Jawab

- Menjalankan server HTTP dan menghubungkan registry route ke penanganan permintaan.
- Menyediakan middleware `requireAuth` dan `getAuthClaims` untuk semua route handler yang dilindungi.
- Menegakkan konvensi amplop respons `{ data }` / `{ error }`.
- Mem-bootstrap semua gateway sesuai urutan dependensi.
- Menginisialisasi skema database saat startup.

## Arsitektur

### Amplop Respons

Semua respons API menggunakan salah satu dari dua bentuk ini:

```json
{ "data": { ... } }
```

```json
{ "error": { "code": "forbidden", "message": "Membutuhkan scope admin" } }
```

### Model Autentikasi

Dapatkan token melalui `POST /api/v1/auth/login`. Kirim token sebagai `Authorization: Bearer <token>`. Masa berlaku token dikendalikan oleh `COGNIS_ACCESS_TOKEN_TTL_SECONDS` (default: `43200`, dua belas jam).

### Lokasi Sumber Utama

| Path                              | Tujuan                                           |
| --------------------------------- | ------------------------------------------------ |
| `src/api/main.ts`                 | Titik masuk server                               |
| `src/api/server.ts`               | Setup server HTTP dan dispatch route             |
| `src/api/reuse/route-registry.ts` | Registry route untuk pendaftaran mandiri gateway |
| `src/api/bootstrap/gateway.ts`    | Konteks bootstrap gateway dan kontrak bootstrap  |
| `src/gateways/auth/guard.ts`      | Middleware `requireAuth`, `getAuthClaims`        |

## Konfigurasi

| Variabel                          | Default      | Keterangan                                    |
| --------------------------------- | ------------ | --------------------------------------------- |
| `DB_TYPE`                         | `postgresql` | Backend database: `postgresql` atau `mariadb` |
| `DATABASE_URL`                    | —            | String koneksi untuk PostgreSQL atau MariaDB  |
| `COGNIS_ACCESS_TOKEN_TTL_SECONDS` | `43200`      | Masa berlaku token Bearer dalam detik         |
| `PORT`                            | `3000`       | Port HTTP                                     |
