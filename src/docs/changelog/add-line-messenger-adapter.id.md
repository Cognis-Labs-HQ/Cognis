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

Gateway autentikasi sekarang memungkinkan adapter auth mengekspos route callback
yang dikelola Cognis. Adapter LINE mendaftarkan `/auth/line/callback`,
menyediakan path tersebut melalui API konfigurasi admin, dan popup
Authentication kini menampilkan URL callback yang dihasilkan serta mengisi
`redirectUri` secara otomatis saat belum ada nilai tersimpan.

## Komponen/berkas yang diubah

- Gateway autentikasi:
    - `src/gateways/auth/gateway.ts`
    - `src/gateways/auth/bootstrap.ts`
    - `src/gateways/auth/manifest.json`
    - `src/gateways/auth/ui/admin-section.js`
    - `src/gateways/auth/ui/languages/en/strings.xml`
    - `src/gateways/auth/ui/languages/de/strings.xml`
    - `src/gateways/auth/ui/languages/id/strings.xml`
    - `src/gateways/auth/ui/languages/ja/strings.xml`
    - `src/gateways/auth/tests/auth-gateway.test.ts`
    - `src/gateways/auth/tests/admin-section.test.js`
    - `src/gateways/auth/docs/index.en.md`
    - `src/gateways/auth/docs/index.de.md`
    - `src/gateways/auth/docs/index.id.md`
    - `src/gateways/auth/docs/index.ja.md`
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

- [0ad1215](https://github.com/le-firehawk/Cognis/commit/0ad1215)
- [dcc34fc](https://github.com/le-firehawk/Cognis/commit/dcc34fc)
- [562d0ed](https://github.com/le-firehawk/Cognis/commit/562d0ed)

---

## Alur OAuth LINE dan Manajemen Redirect URI (tindak lanjut)

### Ringkasan

Adapter LINE kini mengelola URI pengalihan OAuth sepenuhnya melalui rute callback bawaannya. Kolom konfigurasi `redirectUri` telah dihapus dari skema adapter — administrator tidak perlu lagi menempelkan URL ke formulir konfigurasi; URL callback tetap ditampilkan sebagai informasi hanya-baca di popup admin.

Rute callback di `/auth/line/callback` kini menyajikan halaman HTML mandiri saat LINE mengarahkan kembali dengan kode otorisasi. Halaman tersebut memvalidasi status PKCE, menukar kode otorisasi dengan sesi, menyimpan kredensial di `localStorage`, dan mengarahkan ke `/dashboard`. Jika gagal, pengguna diarahkan ke `/login` dengan kode alasan yang sesuai.

Endpoint API baru `/api/v1/auth/line/init` mengekspos ID saluran, pengaturan PKCE, URL endpoint otorisasi, dan cakupan agar halaman login dan register dapat memulai pengalihan OAuth tanpa mengkodekan konstanta khusus LINE secara langsung.

Baik halaman login maupun register kini menyertakan tombol "Masuk dengan LINE" melalui sistem penyedia SSO. Mengkliknya menampilkan popup pengungkapan data LINE; setelah konfirmasi, pengaturan PKCE dilakukan dan pengguna diarahkan ke halaman otorisasi LINE.

Modul baru `src/ui/reuse/oauth-pkce.js` menyediakan fungsi pembantu PKCE generik dan dapat digunakan kembali (`generateRandomString`, `generateCodeChallenge`, `buildAuthorizationUrl`) yang digunakan oleh kedua halaman autentikasi.
