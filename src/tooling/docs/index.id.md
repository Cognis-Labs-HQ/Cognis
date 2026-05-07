# Tooling

## Ikhtisar

Direktori `src/tooling/` berisi semua tooling pengembang untuk kodebase Cognis: skrip linting, generator konfigurasi TypeScript, skrip healthcheck container, dan CLI operasional `cognisctl`.

## Tanggung Jawab

- Menegakkan aturan keterbacaan (tidak ada tab, tidak ada spasi trailing) melalui `lint-readable.mjs`.
- Menegakkan standar placeholder melalui `lint-placeholder.mjs`.
- Menghasilkan `tsconfig.json` yang terkonsolidasi untuk monorepo.
- Menyediakan perintah manajemen operasional melalui `cognisctl`.

## Arsitektur

### CLI `cognisctl`

`cognisctl` adalah permukaan kontrol operasional utama. Modul perintah ditemukan secara otomatis dari:

- `src/tooling/cli/commands/` — perintah inti bawaan
- Setiap `cli/index.js` yang diekspor oleh modul yang terinstal

| Namespace   | Contoh perintah                                                                               |
| ----------- | --------------------------------------------------------------------------------------------- |
| `user:*`    | `user:create`, `user:role`, `user:set-password`, `user:disable`, `user:enable`, `user:delete` |
| `system:*`  | `system:health`, `system:info`                                                                |
| `modules:*` | `modules:list`, `modules:enable`, `modules:disable`                                           |
| `gateway:*` | `gateway:list`                                                                                |
| `api:*`     | `api:token`                                                                                   |

## Konfigurasi

| Variabel                | Default       | Keterangan                                                                   |
| ----------------------- | ------------- | ---------------------------------------------------------------------------- |
| `COGNIS_CLI_TOKEN_PATH` | —             | Path ke file yang berisi token API untuk perintah `cognisctl` terautentikasi |
| `COGNIS_MODULES_ROOT`   | `src/modules` | Digunakan untuk menemukan subperintah yang dikontribusi modul                |
