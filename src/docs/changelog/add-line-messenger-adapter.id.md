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

Ditambahkan juga adapter baru `requests` di Registration Gateway untuk alur
persetujuan manual. Saat registrasi publik dinonaktifkan atau tidak tersedia,
login pertama dari SSO eksternal (termasuk LINE) sekarang membuat permintaan
registrasi berstatus pending alih-alih langsung membuat akun.

Admin dapat meninjau permintaan ini di Administration → Registration untuk
menyetujui atau menolak. UI login sekarang menampilkan toast terlokalisasi
untuk status pending, rejected, dan registration request unavailable.

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
- Adapter permintaan registrasi baru:
    - `src/adapters/registration/requests/index.ts`
    - `src/adapters/registration/requests/package.json`
    - `src/adapters/registration/requests/manifest.json`
    - `src/adapters/registration/requests/tests/requests-adapter.test.ts`
- Registration gateway:
    - `src/gateways/registration/gateway.ts`
    - `src/gateways/registration/bootstrap.ts`
    - `src/gateways/registration/manifest.json`
    - `src/gateways/registration/ui/admin-section.js`
    - `src/gateways/registration/ui/languages/en/strings.xml`
    - `src/gateways/registration/ui/languages/de/strings.xml`
    - `src/gateways/registration/ui/languages/id/strings.xml`
    - `src/gateways/registration/ui/languages/ja/strings.xml`
- UI login + i18n:
    - `src/ui/app/login/index.js`
    - `src/ui/languages/en/strings.xml`
    - `src/ui/languages/de/strings.xml`
    - `src/ui/languages/id/strings.xml`
    - `src/ui/languages/ja/strings.xml`
- Pembaruan indeks versi:
    - `src/docs/versions.en.md`
    - `src/docs/versions.de.md`
    - `src/docs/versions.id.md`
    - `src/docs/versions.ja.md`

## Commit

- [2cafed8](https://github.com/le-firehawk/Cognis/commit/2cafed8)
- [28ffdd6](https://github.com/le-firehawk/Cognis/commit/28ffdd6)
- [0a51d61](https://github.com/le-firehawk/Cognis/commit/0a51d61)
- [9144ee3](https://github.com/le-firehawk/Cognis/commit/9144ee3)
