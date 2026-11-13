# Pemeriksaan tipe menyeluruh

**Cabang Fitur:** feature-complete-type-verification

## Pemeriksaan sumber TypeScript

Jalankan `npm run typecheck` sebelum melakukan commit. `npm run ci:test` memeriksa tipe sebelum menjalankan pengujian; kedua pipeline CI memakai pemeriksa yang sama. `npm run build` menghasilkan aset produksi secara terpisah melalui esbuild untuk Node 24.

`tsconfig.json` pada akar merupakan proyek ketat utama tanpa keluaran berkas. Konfigurasi ini mencakup seluruh berkas `.ts`, `.tsx`, `.mts`, dan `.cts` di bawah `src`, termasuk deklarasi, pengujian, komponen opsional, dan komponen bersarang. Hanya direktori hasil `dist` dan dependensi yang dikecualikan. Komponen baru tidak memerlukan pembaruan daftar referensi.

Resolusi NodeNext serta pustaka ES2024 dan DOM mendukung kontrak server dan browser. `@cognis/core` mengarah ke sumber checkout ini. JavaScript milik proyek yang diimpor menyumbangkan tipe hasil inferensi melalui `allowJs`; `checkJs` tetap dinonaktifkan, sehingga ini bukan pemeriksaan seluruh JavaScript. Konfigurasi komponen tidak membatasi cakupan akar.

Pengujian cakupan membandingkan inventaris compiler dengan inventaris sumber yang tidak kosong, menjalankan perintah npm sebenarnya pada fixture statis, menolak kesalahan produksi dan pengujian secara terpisah, serta memastikan pemeriksaan bersih berulang tidak menghasilkan berkas.

## Commit

- https://github.com/Cognis-Labs-HQ/Cognis/commit/61adeda08a08fbf2b6dc7f1cabfb6e1303410f83
