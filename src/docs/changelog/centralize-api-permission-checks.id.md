# Catatan Perubahan PR — Pemusatan Pemeriksaan Izin API

## Ringkasan

Memperbaiki bug di mana peran `owner` ditolak mengakses endpoint API berbasis
pengguna karena penangan rute menggunakan pencocokan string tepat
`role === "admin"` alih-alih perbandingan berbasis pangkat. Karena `owner`
berada di atas `admin` dalam hierarki peran, pemilik secara keliru mendapatkan
403 pada endpoint seperti `GET /api/v1/users/:id/emails` dan
`GET /api/v1/users/:id/notification-prefs`.

Diperkenalkan dua fungsi pembantu yang dapat digunakan kembali di
`src/gateways/auth/guard.ts`:

- `hasMinRole(role, minRole)` — mengembalikan `true` apabila peran yang
  diberikan memenuhi atau melebihi pangkat minimum, menggunakan hierarki
  `user < teacher < moderator < admin < owner`.
- `canAccessUserData(claims, targetUsername)` — mengembalikan `true` apabila
  pemanggil adalah pengguna target itu sendiri, atau memiliki setidaknya
  pangkat admin.

Kedua fungsi pembantu diekspor ulang melalui `src/gateways/shared.ts` untuk
pengembang gateway. Semua penangan rute yang sebelumnya melakukan perbandingan
string ad-hoc terhadap `"admin"` atau `"owner"` kini menggunakan fungsi
pembantu ini.

## Komponen dan berkas yang diubah

- Auth Guard (fungsi pembantu baru):
    - `src/gateways/auth/guard.ts`
    - `src/gateways/shared.ts`
- Rute gateway notifikasi (perbaikan akses pemilik):
    - `src/gateways/notify/bootstrap.ts`
    - `src/gateways/notify/routes/notifications.ts`
- Rute pengguna (pembaruan konsistensi):
    - `src/api/routes/users/index.ts`
- Rute adaptor profil (perbaikan akses pemilik dan konsistensi):
    - `src/adapters/social/profile/routes/preferences.ts`
    - `src/adapters/social/profile/routes/files.ts`
    - `src/adapters/social/profile/routes/posts.ts`
- Pengujian (cakupan baru untuk akses pemilik):
    - `src/gateways/notify/tests/email-routes.test.ts`
    - `src/gateways/notify/routes/tests/notification-routes.test.ts`
