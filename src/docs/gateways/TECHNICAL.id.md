# Referensi Teknis

Bootstrap gateway menghubungkan kontrak domain publik, rute, dan adaptor opsional dengan host.

## Antarmuka

`bootstrap(ctx)` menerima `GatewayBootstrapContext`: registry kapabilitas, rute, gateway dan UI, akses flow, akar adaptor, serta logging. Gateway mendeklarasikan kontrak domain berversi melalui `system:contracts`; adaptor dapat mendeklarasikan kontraknya dengan `defineContracts(ctx)`.

## Konfigurasi

`COGNIS_GATEWAYS_ROOT` dan `COGNIS_ADAPTERS_ROOT` menentukan akar penemuan. Manifes gateway menyatakan `id`, `uuid` tetap, `version`, serta `requires` berbasis UUID. `documentation` menunjuk keluarga lokal `docs/README.en.md`, `docs/USAGE.en.md`, dan `docs/TECHNICAL.en.md`. [Standar dokumen](/docs/standard/technical) menentukan seluruh terjemahan.

## Perilaku

GatewayService menemukan titik masuk bootstrap dan mengurutkan dependensi. Versi registry runtime berasal dari `readGatewayManifestVersion`, bukan literal kedua. Registrasi dimiliki lingkup bootstrap dan dibatalkan ketika gagal. Loader adaptor memberikan konteks khusus domain; hook dan factory berbeda antar-gateway. Prosedur tersedia pada [Penggunaan](/docs/gateways/usage).

## Keamanan

Konsumen memakai kapabilitas publik atau flow bernama, bukan mengimpor implementasi komponen lain. Kontrak wajib harus tersedia sebelum operasi berjalan. Rute dan mutasi memeriksa otorisasi akun serta sumber daya pada pemilik domain.

## Referensi

- [src/gateways/shared.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/gateways/shared.ts)
- [src/core/services/gateway-service.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/core/services/gateway-service.ts)
- [src/gateways/reuse/manifest-version.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/gateways/reuse/manifest-version.ts)
- [src/gateways/reuse/adapter-bootstrap.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/gateways/reuse/adapter-bootstrap.ts)
