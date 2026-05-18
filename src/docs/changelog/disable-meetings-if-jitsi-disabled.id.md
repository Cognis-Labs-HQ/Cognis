# Sembunyikan Administration → Meetings Saat Jitsi Meet Dinonaktifkan

## Ringkasan

- Bagian Administration → Meetings kini disembunyikan saat modul Jitsi Meet dinonaktifkan.
- Antarmuka `AdminSection` kini mendukung `isEnabled` sehingga bagian admin yang dikontribusikan modul mengikuti status aktif modul tersebut.
- Endpoint `/api/v1/admin/sections` kini memfilter bagian yang predikat `isEnabled`-nya mengembalikan false.
- Rute ekstensi modul kini menyuntikkan `isEnabled` pada `registerAdminSection`, konsisten dengan `registerNavbarPlugin`, `registerSpaRoute`, dan `registerSettingsSection`.

## File/Komponen yang Diubah

- `src/api/ui-registry.ts`
- `src/api/routes/gateways/index.ts`
- `src/modules/routes/module-extensions.ts`
- `src/api/tests/gateways/gateway-routes.test.ts`
- `src/api/package.json`
- `src/modules/package.json`
- `src/docs/versions.en.md`

## Tautan Commit

- https://github.com/le-firehawk/Cognis/commit/46e8aae8353774aef82d36f294e0cb566ba29cc3
