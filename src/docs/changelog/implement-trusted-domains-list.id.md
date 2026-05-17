# Domain Tepercaya

## Ringkasan

Validasi domain tepercaya bersama ditambahkan sehingga daftar keamanan di Administration sekarang mengendalikan pemeriksaan domain email sekaligus pengalihan dan tautan broadcast HTTP(S) eksternal tepercaya.

Validasi pengalihan broadcast sekarang menerima URL dengan origin yang sama dan domain tepercaya, sementara pemeriksaan UI dan server menggunakan aturan pencocokan yang sama, termasuk subdomain.

## File / Komponen yang Berubah

- `src/api/reuse/security-settings.ts` dan `src/api/routes/system/index.ts` — Memusatkan parsing pengaturan keamanan serta validasi domain dan URL tepercaya bersama.
- `src/gateways/registration/bootstrap.ts` — Menggunakan kembali pencocok domain tepercaya bersama untuk validasi email undangan.
- `src/gateways/notify/bootstrap.ts`, `src/gateways/notify/routes/notifications.ts`, dan `src/gateways/notify/ui/*` — Mengizinkan pengalihan broadcast eksternal tepercaya dan memakai ulang pemeriksaan bersama pada alur admin maupun runtime.
- `src/ui/reuse/trusted-domains.js`, `src/ui/app/administration/security.js`, dan `src/ui/app/settings/general-prefs.js` — Menambahkan pemuatan domain tepercaya sisi UI, invalidasi cache, dan pencocokan untuk pemeriksaan email dan tautan.
- `src/api/tests/security-settings.test.ts`, `src/gateways/notify/routes/tests/notification-routes.test.ts`, dan `src/ui/tests/trusted-domains.test.js` — Menambahkan cakupan untuk normalisasi domain tepercaya dan perilaku validasi URL.
- `src/api/package.json`, `src/gateways/notify/manifest.json`, `src/gateways/registration/manifest.json`, dan `src/docs/versions.en.md` — Menaikkan versi komponen untuk API, gateway Notification, dan gateway Registration.

## Commit

- https://github.com/le-firehawk/Cognis/commit/85294ff
