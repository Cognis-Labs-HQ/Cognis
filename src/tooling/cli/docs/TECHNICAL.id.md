# Referensi Teknis

Antarmuka publik dan aturan operasional Alat Baris Perintah.

## Antarmuka

Ruang kerja ini menyediakan kode platform bersama. Kontrak fitur publik dimiliki kemampuan, perintah, atau gerbang yang didokumentasikan; paket ini tidak menyediakan layanan HTTP terpisah.

## Konfigurasi

### Konfigurasi

| Variabel                       | Default            | Keterangan                                                                   |
| ------------------------------ | ------------------ | ---------------------------------------------------------------------------- |
| `COGNIS_CLI_TOKEN_PATH`        | —                  | Path ke file yang berisi token API untuk perintah `cognisctl` terautentikasi |
| `COGNIS_EXTERNAL_MODULES_ROOT` | `external-modules` | Digunakan untuk menemukan subperintah modul                                  |
| `COGNIS_GATEWAY_CLI_PATHS`     | —                  | Daftar path opsional untuk subperintah gateway                               |
| `COGNIS_ADAPTER_CLI_PATHS`     | —                  | Daftar path opsional untuk subperintah adapter                               |

## Perilaku

### Ikhtisar

Direktori `src/tooling/` berisi semua tooling pengembang untuk kodebase Cognis: skrip linting, generator konfigurasi TypeScript, skrip healthcheck container, dan CLI operasional `cognisctl`.

### Tanggung Jawab

- Menegakkan aturan keterbacaan (tidak ada tab, tidak ada spasi trailing) melalui `lint-readable.mjs`.
- Menegakkan standar placeholder melalui `lint-placeholder.mjs`.
- Menghasilkan `tsconfig.json` yang terkonsolidasi untuk monorepo.
- Menyediakan perintah manajemen operasional melalui `cognisctl`.

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

## Keamanan

Kemampuan dan perintah publik mempertahankan otorisasi setiap operasi. Memasang paket tidak memberikan akses ke sumber daya pribadi.

## Referensi

Kode sumber dan metadata paket: `src/tooling/cli/`.
