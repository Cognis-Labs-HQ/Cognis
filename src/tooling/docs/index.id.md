# Tooling

## Ikhtisar

Direktori `src/tooling/` berisi semua tooling pengembang untuk kodebase Cognis: skrip linting, pemeriksaan sumber TypeScript, skrip healthcheck container, dan CLI operasional `cognisctl`.

## Tanggung Jawab

- Menegakkan aturan keterbacaan (tidak ada tab, tidak ada spasi trailing) melalui `lint-readable.mjs`.
- Menegakkan standar placeholder melalui `lint-placeholder.mjs`.
- Memeriksa seluruh sumber TypeScript dan pengujian dengan `npm run typecheck`.
- Menyediakan perintah manajemen operasional melalui `cognisctl`.

## Arsitektur

### Pemeriksaan sumber TypeScript

Jalankan `npm run typecheck` sebelum melakukan commit. `npm run ci:test` memeriksa tipe sebelum menjalankan pengujian; kedua pipeline CI memakai pemeriksa yang sama. `npm run build` menghasilkan aset produksi secara terpisah melalui esbuild untuk Node 24.

`tsconfig.json` pada akar merupakan proyek ketat utama tanpa keluaran berkas. Konfigurasi ini mencakup seluruh berkas `.ts`, `.tsx`, `.mts`, dan `.cts` di bawah `src`, termasuk deklarasi, pengujian, komponen opsional, dan komponen bersarang. Hanya direktori hasil `dist` dan dependensi yang dikecualikan. Komponen baru tidak memerlukan pembaruan daftar referensi.

Resolusi NodeNext serta pustaka ES2024 dan DOM mendukung kontrak server dan browser. `@cognis/core` mengarah ke sumber checkout ini. JavaScript milik proyek yang diimpor menyumbangkan tipe hasil inferensi melalui `allowJs`; `checkJs` tetap dinonaktifkan, sehingga ini bukan pemeriksaan seluruh JavaScript. Konfigurasi komponen tidak membatasi cakupan akar.

Pengujian cakupan membandingkan inventaris compiler dengan inventaris sumber yang tidak kosong, menjalankan perintah npm sebenarnya pada fixture statis, menolak kesalahan produksi dan pengujian secara terpisah, serta memastikan pemeriksaan bersih berulang tidak menghasilkan berkas.

### CLI `cognisctl`

`cognisctl` adalah permukaan kontrol operasional utama. Modul perintah ditemukan secara otomatis dari:

- `src/tooling/cli/commands/` — perintah inti bawaan
- Setiap `cli/index.js` yang diekspor oleh modul yang terinstal

| Namespace     | Contoh perintah                                                                                                               |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `user:*`      | `user:create`, `user:role`, `user:set-password`, `user:disable`, `user:enable`, `user:delete`                                 |
| `system:*`    | `system:health`, `system:info`                                                                                                |
| `component:*` | `component:list`, `component:enable`, `component:disable`, `component:import`, `component:config:get`, `component:config:set` |
| `api:*`       | `api:token` (menerbitkan token admin darurat sementara 1 jam untuk curl)                                                      |

Perintah bawaan `cognisctl` dapat merender keluaran terminal yang memahami respons dengan judul, kolom sejajar, dan warna ANSI saat terminal mendukungnya; perintah tanpa perender khusus akan kembali ke JSON yang diformat.

## Konfigurasi

| Variabel                       | Default            | Keterangan                                                                   |
| ------------------------------ | ------------------ | ---------------------------------------------------------------------------- |
| `COGNIS_CLI_TOKEN_PATH`        | —                  | Path ke file yang berisi token API untuk perintah `cognisctl` terautentikasi |
| `COGNIS_EXTERNAL_MODULES_ROOT` | `external-modules` | Digunakan untuk menemukan subperintah modul                                  |
| `COGNIS_GATEWAY_CLI_PATHS`     | —                  | Daftar path opsional untuk subperintah gateway                               |
| `COGNIS_ADAPTER_CLI_PATHS`     | —                  | Daftar path opsional untuk subperintah adapter                               |
