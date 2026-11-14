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

## Kredensial Uji Terisolasi

`npm test` dan `npm run ci:test` membuat direktori penyimpanan token sementara untuk setiap proses pengujian dan berkas terpisah yang dapat ditulis untuk setiap pekerja uji. Pemuatan awal statis menetapkan berkas sebelum modul pengujian dimuat, dengan mengabaikan lokasi penyimpanan token produksi yang diwarisi. Pengujian boleh mengganti lokasinya sendiri setelah itu untuk kasus mulai ulang atau kegagalan. Pelaksana menghapus direktori sementara setelah proses anak berhasil atau gagal dan meneruskan sinyal penghentian biasa. Penghentian paksa atau kegagalan mesin dapat menyisakan berkas sementara untuk dibersihkan sistem operasi. Penyimpanan token produksi tetap menolak keberhasilan saat terjadi kegagalan dan tidak berubah.
