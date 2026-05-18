# Changelog PR — Menambahkan Deteksi Bahasa Browser

## Ringkasan

Inisialisasi bahasa UI kini memprioritaskan preferensi bahasa dari browser pada
pemuatan awal dan menerapkannya jika paket bahasa tersebut didukung aplikasi.

Pilihan bahasa pada halaman registrasi sekarang otomatis memilih bahasa
terdeteksi yang didukung, lalu mempertahankan pilihan itu sampai pengguna
mengubahnya sendiri.

## Komponen dan file yang diubah

- `src/ui/reuse/i18n.js`
- `src/ui/app/register/index.js`
- `src/ui/tests/browser-language-detection.test.js`

## Commit

- [pending](https://github.com/le-firehawk/Cognis/commit/pending)
