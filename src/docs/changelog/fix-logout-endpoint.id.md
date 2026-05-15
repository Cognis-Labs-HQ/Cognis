# Memperbaiki Endpoint Logout yang Tidak Ada

## Ringkasan

Endpoint `POST /api/v1/auth/logout` mengembalikan 404 untuk semua permintaan.
Handler logout hanya ada di file lama `routes/index.ts` (`createAuthRoutes`)
yang tidak pernah didaftarkan. Handler rute aktif, `createAuthGatewayRoutes`
di `bootstrap.ts`, tidak memiliki kasus logout sama sekali.

Perbaikan ini menambahkan endpoint logout langsung ke `createAuthGatewayRoutes`.
Saat logout, handler mencabut token cookie dan token Bearer yang dikirim melalui
header `Authorization`, menghapus cookie `cognis_access_token`, serta mencatat
kejadian tersebut pada level `info`.

## File / Komponen yang Diubah

- `src/gateways/auth/bootstrap.ts` — menambahkan rute `POST /api/v1/auth/logout`
  ke `createAuthGatewayRoutes`; mengimpor `revokeAccessToken` dari
  `access-tokens.js`

## Tautan Commit

- https://github.com/le-firehawk/Cognis/commit/79bc1e7242a82f3f6a3b15c0210cdf32ef752893
