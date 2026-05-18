# Changelog PR — Menambahkan Deteksi Bahasa Browser

## Ringkasan

Inisialisasi bahasa UI kini memprioritaskan preferensi bahasa dari browser pada
pemuatan awal dan menerapkannya jika paket bahasa tersebut didukung aplikasi.

Pilihan bahasa pada halaman registrasi sekarang otomatis memilih bahasa
terdeteksi yang didukung, lalu mempertahankan pilihan itu sampai pengguna
mengubahnya sendiri.

Prioritas bahasa kini dievaluasi ulang dari bahasa browser/sistem setiap
refresh, sehingga perubahan bahasa di browser atau OS langsung diterapkan, dan
bahasa Inggris tetap menjadi fallback yang selalu tersedia.

## Komponen dan file yang diubah

- `src/ui/reuse/i18n.js`
- `src/ui/app/register/index.js`
- `src/ui/tests/browser-language-detection.test.js`

## Commit

- [0b39a0e](https://github.com/le-firehawk/Cognis/commit/0b39a0e)
- [d9550aa2](https://github.com/le-firehawk/Cognis/commit/d9550aa2)
- [a70d7e70](https://github.com/le-firehawk/Cognis/commit/a70d7e70)
- [c8634d6e](https://github.com/le-firehawk/Cognis/commit/c8634d6e)
