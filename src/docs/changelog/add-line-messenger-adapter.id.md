# Changelog PR — Menambahkan Adapter LINE Messenger

## Ringkasan

Menambahkan adapter autentikasi `line` baru untuk gateway auth.

Implementasi mencakup LINE Login authorization code dengan dukungan alur
PKCE untuk pengguna mobile (termasuk handoff ke aplikasi LINE), pengambilan
profil, dan verifikasi ID token.

Menambahkan sinkronisasi lifecycle identitas eksternal pada login auth:
pembuatan akun saat login eksternal pertama, sinkronisasi langsung display name
dan URL gambar profil, serta penegakan status lifecycle (`active`, `unlinked`,
`deactivated`, `deleted`).

Juga ditambahkan route pengguna untuk unlink identitas provider:
`POST /api/v1/auth/providers/:provider/unlink`, yang menandai identitas sebagai
unlinked, menonaktifkan akun, dan mencabut token.

## Komponen/berkas yang diubah

- Gateway autentikasi:
    - `src/gateways/auth/gateway.ts`
    - `src/gateways/auth/bootstrap.ts`
    - `src/gateways/auth/manifest.json`
- Adapter auth LINE baru:
    - `src/adapters/auth/line/index.ts`
    - `src/adapters/auth/line/tests/line-adapter.test.ts`
    - `src/adapters/auth/line/package.json`
    - `src/adapters/auth/line/manifest.json`
    - `src/adapters/auth/line/tsconfig.json`
    - `src/adapters/auth/line/docs/index.en.md`
    - `src/adapters/auth/line/docs/index.de.md`
    - `src/adapters/auth/line/docs/index.id.md`
    - `src/adapters/auth/line/docs/index.ja.md`
- Pembaruan indeks versi:
    - `src/docs/versions.en.md`
    - `src/docs/versions.de.md`
    - `src/docs/versions.id.md`
    - `src/docs/versions.ja.md`

## Commit

- [2cafed8](https://github.com/le-firehawk/Cognis/commit/2cafed8)
