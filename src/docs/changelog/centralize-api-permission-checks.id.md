# Pemeriksaan Izin API

## Ringkasan

Celah otorisasi untuk peran `owner` pada endpoint API berbasis pengguna telah
diperbaiki, dan evaluasi akses peran dipusatkan.

Sistem kebijakan peran yang lebih luas juga ditambahkan:

- Rute API dari modul kini dapat mendeklarasikan `minRole` (berbasis hirarki)
  atau `onlyRole` (akses eksklusif satu peran).
- Halaman/ekstensi UI dari modul, gateway, dan adaptor kini dapat
  mendeklarasikan aturan yang sama, lalu difilter secara terpusat.

Tampilan peran di UI juga diperjelas agar `owner` dan `admin` mudah dibedakan,
serta `moderator` diperlakukan sebagai peran penuh.

## Komponen dan Berkas yang Diubah

- Primitive kebijakan peran di auth:
    - `src/gateways/auth/guard.ts`
    - `src/gateways/shared.ts`
- Dukungan kebijakan peran untuk rute API modul:
    - `src/modules/routes/module-extensions.ts`
    - `src/modules/sample-analytics/api/index.js`
    - `src/modules/routes/tests/module-extension-routes.test.ts`
- Dukungan kebijakan peran untuk deklarasi rute UI modul:
    - `src/api/routes/ui/index.ts`
    - `src/modules/sample-analytics/routes.json`
    - `src/core/services/module-service.ts`
- Pemfilteran kebijakan peran untuk ekstensi UI (gateway/adaptor/modul):
    - `src/api/ui-registry.ts`
    - `src/api/routes/gateways/index.ts`
    - `src/api/tests/ui/ui-routes.test.ts`
    - `src/api/tests/gateways/gateway-routes.test.ts`
- Label peran dan keluaran UI:
    - `src/ui/reuse/access-role.js`
    - `src/ui/app/users/index.js`
    - `src/ui/app/dashboard/index.js`
    - `src/ui/languages/en/strings.xml`
    - `src/ui/languages/de/strings.xml`
    - `src/ui/languages/id/strings.xml`
    - `src/ui/languages/ja/strings.xml`
- Dokumentasi framework modul:
    - `src/modules/docs/index.en.md`

## Commits

- [93e5f7f](https://github.com/le-firehawk/Cognis/commit/93e5f7f)
- [411e267](https://github.com/le-firehawk/Cognis/commit/411e267)
