# Memperbaiki Endpoint

**Feature Branch:** copilot/fix-logout-endpoint

## Ringkasan

Endpoint `POST /api/v1/auth/logout` mengembalikan 404 untuk semua permintaan.
Handler logout hanya ada di file lama `routes/index.ts` (`createAuthRoutes`)
yang tidak pernah didaftarkan. Handler rute aktif, `createAuthGatewayRoutes`
di `bootstrap.ts`, tidak memiliki kasus logout sama sekali.

Perbaikan ini menambahkan endpoint logout langsung ke `createAuthGatewayRoutes`.
Saat logout, handler mencabut token cookie dan token Bearer yang dikirim melalui
header `Authorization`, menghapus cookie `cognis_access_token`, serta mencatat
kejadian tersebut pada level `info`.

Alur logout dashboard sekarang mengirim `POST /api/v1/auth/logout` sebelum
pembersihan token lokal dan menyertakan token Bearer saat token lokal tersedia,
agar token aktif benar-benar dicabut di sisi server pada alur pengguna normal.

## File / Komponen yang Diubah

- `src/gateways/auth/bootstrap.ts` — menambahkan rute `POST /api/v1/auth/logout`
  ke `createAuthGatewayRoutes`; mengimpor `revokeAccessToken` dari
  `access-tokens.js`
- `src/api/reuse/access-token-http.ts` — helper bersama untuk deteksi cookie
  Secure, pembentukan cookie access token, ekstraksi token dari cookie, dan
  ekstraksi token Bearer untuk rute autentikasi
- `src/ui/layouts/dashboard-layout.js` — mengirim permintaan logout sebelum
  penghapusan token lokal dan menambahkan `Authorization: Bearer ...` saat
  token lokal tersedia
- `src/ui/tests/dashboard-layout-menu.test.js` — menambahkan regresi untuk
  urutan permintaan logout dan keberadaan header Bearer

## Tautan Commit

- https://github.com/Cognis-Labs-HQ/Cognis/commit/79bc1e7242a82f3f6a3b15c0210cdf32ef752893

## Commits
