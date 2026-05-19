# Kecualikan Admin dari Entri Menu Invite Pendiri

## Ringkasan

Aturan visibilitas entri Invite pada navbar Registration diperbarui agar pengguna pendiri dengan akses setara admin tidak lagi melihat entri Invite.

Admin dan owner sudah memiliki manajemen undangan lewat halaman Users, sehingga tautan cepat Invite kini hanya tampil untuk pendiri non-admin.

## File / Komponen yang Berubah

- `src/gateways/registration/ui/navbar.js` — Menambahkan normalisasi peran admin (`admin` dan `owner`) dan memakainya pada pemeriksaan visibilitas menu Invite.
- `src/gateways/registration/tests/navbar.test.js` — Menambahkan cakupan regresi yang mengunci pengecualian pendiri setara admin dari menu Invite.
- `src/gateways/registration/bootstrap.ts`, `src/gateways/registration/manifest.json`, dan `src/docs/versions.en.md` — Menaikkan versi komponen gateway Registration ke `1.1.7`.

## Commit

- https://github.com/le-firehawk/Cognis/commit/041fdb8
- https://github.com/le-firehawk/Cognis/commit/d47ee73
