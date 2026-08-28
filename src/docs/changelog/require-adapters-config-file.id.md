# Wajibkan Kontrak Kontrol Admin

## Ringkasan

Kontrol adapter di halaman Administration kini disejajarkan agar gateway mengumumkan endpoint konfigurasi dan toggle adapter, adapter Registration menerima penyimpanan konfigurasi kosong, dan adapter Study menyediakan penanganan disable.

Halaman Administration sekarang memakai kontrol adapter yang diumumkan tersebut secara langsung dan menyinkronkan ulang status toggle setelah refresh, sehingga slider gateway tetap cocok dengan status Disabled saat adapter aktif terakhir dimatikan.

## File / Komponen yang Berubah

- `src/api/reuse/adapter-admin-controls.ts` — Menambahkan helper lapisan API bersama untuk mengumumkan endpoint config, enable, disable, dan test opsional milik adapter.
- `src/ui/app/administration/index.js` — Mengubah UI Administration agar memakai kontrol adapter yang diumumkan dan menerapkan ulang status toggle gateway serta adapter setelah refresh page-composer.
- `src/gateways/registration/bootstrap.ts`, `src/gateways/study/bootstrap.ts`, `src/gateways/social/bootstrap.ts`, dan `src/gateways/notify/bootstrap.ts` — Mengumumkan kontrol admin adapter pada daftar gateway dan menambahkan penanganan route admin Registration/Study yang sebelumnya hilang.
- `src/gateways/study/gateway.ts` — Menambahkan dukungan runtime untuk enable/disable adapter Study dan penyimpanan konfigurasi yang menghormati flag `enabled`.
- `src/gateways/registration/tests/bootstrap.test.ts` dan `src/gateways/study/tests/bootstrap.test.ts` — Menambahkan cakupan regresi untuk kontrol yang diumumkan dan route admin adapter yang telah diperbaiki.
- `.github/copilot-instructions.md`, `src/gateways/{notify,registration,social,study}/manifest.json`, dan `src/docs/versions.en.md` — Mendokumentasikan syarat kontrak kontrol admin adapter dan menaikkan versi gateway yang terdampak.

## Commit

- https://github.com/Cognis-Labs-HQ/Cognis/commit/6b706ae
