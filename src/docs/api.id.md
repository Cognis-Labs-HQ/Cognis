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

| Variabel                          | Default                      | Keterangan                                          |
| --------------------------------- | ---------------------------- | --------------------------------------------------- |
| `DB_TYPE`                         | `postgresql`                 | Backend database: `postgresql` atau `mariadb`       |
| `DATABASE_URL`                    | —                            | String koneksi untuk PostgreSQL atau MariaDB        |
| `COGNIS_ACCESS_TOKEN_TTL_SECONDS` | `43200`                      | Masa berlaku token Bearer dalam detik               |
| `COGNIS_MODULE_SOURCES_PATH`      | `config/module-sources.json` | Path persisten untuk konfigurasi sumber bursa modul |
| `PORT`                            | `3000`                       | Port HTTP                                           |

## Keterjangkauan

`GET /api/v1/system/healthcheck` segera mengembalikan `{ "data": { "status": "ok" } }` tanpa menjalankan pemeriksaan komponen. Endpoint ini dipakai untuk deteksi koneksi. `GET /api/v1/system/health` tetap menyediakan kesehatan komponen terperinci, cap waktu, dan waktu aktif. Komponen opsional yang lambat tidak boleh membuat server yang tersedia dianggap luring.

## Kesiapan rute luring

`offline:registerSessionRoutes(ids, signal, { available })` menerima predikat pemilik opsional yang dipanggil dengan rute dan jalur saat luring. Pembatalan sinyal menghapus deklarasi. Host menyiapkan kode publik dan gaya halaman secara terpisah melalui `offline:prepareRouteAssets`; `offline:areRouteAssetsReady` melaporkan penyelesaian. `createOfflineReadCache` menyediakan `read.has(key)`, dan klien HTTP tercakup menyediakan `request.hasCachedRead(path)`, tanpa mengembalikan data privat. Pemeriksaan mencakup identitas akun/sesi, kedaluwarsa, generasi cache, dan siklus hidup penyedia. Pemeriksaan ini tidak memberikan otorisasi atau menggantikan persetujuan dokumen hukum tersimpan.
