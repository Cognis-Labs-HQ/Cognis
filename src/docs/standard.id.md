# Standar Kontributor

Komponen Cognis memakai direktori yang konsisten, kontrak ctx publik dan dokumentasi lokal agar kontributor dapat memperluas komponen tanpa terikat pada implementasi lain.

## Contoh penggunaan

Buat modul eksternal dari [cognis-module-template](https://github.com/Cognis-Labs-HQ/cognis-module-template). Tetapkan UUID baru untuk produk, ganti metadata templat, dan pertahankan panduan serta alat validasinya. Jitsi Meet menjadi integrasi rujukan untuk struktur dan kontrak siklus hidup berikut.

```sh
npm --prefix <module-checkout> test
cognisctl modules:jitsi-meet:ping
```

## Spesifikasi teknis

### Kepemilikan komponen

Kontrak inti berada di `src/core/`, gateway di `src/gateways/<id>/`, adapter di `src/adapters/<gateway>/<id>/`, dan modul eksternal di repositorinya sendiri. Setiap komponen memiliki kode server, aset browser, CLI, dokumentasi dan pembersihan. Impor tetap di dalam komponen; perilaku lintas komponen diperoleh melalui kapabilitas ctx dan alur bertahap bernama. Penyedia opsional harus dapat dihapus tanpa merusak pemakainya.

### Struktur modul wajib

Jalur berikut wajib untuk fungsi yang disediakan modul. Jangan membuat direktori kosong untuk fungsi yang tidak didukung. `manifest.json`, `package.json`, `routes.json` dan `bootstrap.js` wajib di root. Bootstrap menghubungkan dependensi dan mendaftarkan perilaku; handler domain memvalidasi dan mengatur, sedangkan store serta kapabilitas menjalankan pekerjaan. `ui/index.html` yang dideklarasikan boleh menjadi kerangka halaman. Pertahankan URL rute saat memindahkan berkas.

| Jalur                                             | Tanggung jawab   |
| ------------------------------------------------- | ---------------- |
| `api/routes/<domain>/index.js`                    | HTTP             |
| `api/<feature>/`, `api/reuse/`                    | Server           |
| `ui/app/<page>/index.js`, `ui/<feature>/`         | Browser          |
| `ui/styles/`, `ui/styles/reuse/`                  | CSS              |
| `ui/templates/`                                   | HTML             |
| `ui/languages/<locale>/strings.xml`               | i18n             |
| `api/tests/`, `ui/tests/`, `cli/tests/`, `tests/` | Pengujian        |
| `cli/index.js`                                    | CLI              |
| `docs/`, `docs/changelog/`                        | Markdown         |
| `data/`, `assets/`, `scripts/`, `tooling/`        | Data, aset, alat |

### Pemakaian ulang dan pemeriksaan

Gunakan `reuse/` hanya untuk abstraksi yang dipakai lintas fitur dalam lapisan pemiliknya. Letakkan logika fitur bersama fiturnya dan pakai nama berkas generik di direktori domain. Jangan membuat direktori `shared/`, `utils/`, `helpers/` atau `common/`. Pertahankan jarak deklarasi yang terbaca dan batas 1000 baris sumber. Pemeriksaan struktur menolak style di lokasi salah dan handler rute datar; uji kontrak publik memeriksa izin, rollback, pemasangan ulang dan siklus aktif-nonaktif-aktif. Skrip npm milik checkout: gunakan `npm --prefix <module-checkout> test`. Perintah operasional terpasang memakai `cognisctl modules:<module-id>:<action>`.

### Kontrak dokumentasi

Setiap dokumen integrasi dimulai dengan H1 maksimal 30 karakter dan paragraf pembuka yang menjelaskan fungsinya. H2 pertama memuat contoh kontrak publik; H2 berikut memulai spesifikasi teknis. Ikuti `.github/DOCUMENTATION_TEMPLATE.<locale>.md`. Gunakan H3 untuk input, output, validasi, izin, kesalahan, perubahan keadaan, penyimpanan, keamanan, tahap perluasan dan pembersihan. Jelaskan kapabilitas wajib, dependensi opsional, versi yang didukung dan perilaku kegagalan. Dokumen standar menjelaskan kontrak saat ini, bukan riwayat rilis.

### Lokalisasi dan integritas

Sediakan varian Jerman, Inggris, Indonesia dan Jepang dengan struktur selaras dan terjemahan yang benar. Ikhtisar integrasi ada di `docs/index.<locale>.md`, kontrak khusus di sebelahnya. Catatan rilis ada di `docs/changelog/`, atau `src/docs/changelog/` untuk inti: satu set empat bahasa per PR dan tautan commit berurutan tanpa baris kosong. Kecualikan catatan rilis, symlink, alias dan manifest itu sendiri dari digest modul. Selaraskan paket, lockfile, manifest dan batas versi dependensi yang diuji; buat ulang dan validasi hash setelah perubahan berkas terakhir.
