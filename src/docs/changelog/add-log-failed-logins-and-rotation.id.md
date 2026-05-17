# Filter & Rotasi Log

## Ringkasan

- Login gagal dan perubahan akun pengguna penting kini dicatat sebagai peringatan.
- File log kini menyimpan semua level log.
- `LOG_LEVEL` sekarang diterapkan sebagai filter pada stream log runtime sambil tetap menyimpan semua level ke file log.
- Menambahkan rotasi log backend dengan kompresi gzip untuk arsip hasil rotasi.
- Filter prioritas default pada UI log Administrasi diubah menjadi peringatan.

## Berkas/Komponen yang Berubah

- `src/gateways/logging/logger.ts`
- `src/gateways/logging/bootstrap.ts`
- `src/gateways/logging/ui/admin-section.js`
- `src/api/routes/users/index.ts`
- `src/gateways/logging/tests/*`
- `src/api/tests/users/user-routes.test.ts`
- `src/gateways/logging/manifest.json`
- `src/docs/versions.en.md`
- `src/gateways/logging/docs/index.*.md`
- `src/docs/devops.*.md`

## Tautan Commit

- https://github.com/le-firehawk/Cognis/commit/749469a351ca8fad839ef6cf3f3d4eed81717b3a
