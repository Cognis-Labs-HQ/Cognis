# Changelog PR — Periksa Implementasi Router SPA

## Ringkasan

Menyelesaikan pass konsistensi SPA pada entrypoint halaman dengan menambahkan
cakupan router untuk halaman Undangan serta menyelaraskan pola `mount()` +
direct-load guard pada halaman autentikasi dan undangan.

Metadata komposer login/registrasi juga disesuaikan agar memenuhi kebutuhan
`pageContext` (judul + subjudul), dan render daftar modul diperbaiki untuk
layar kecil dengan container tabel responsif.

## Komponen dan berkas yang diubah

- Router dan pengujian SPA:
    - `src/ui/reuse/app-router.js`
    - `src/ui/tests/app-router.test.js`
- Entrypoint halaman:
    - `src/ui/app/invite/index.js`
    - `src/ui/app/login/index.js`
    - `src/ui/app/register/index.js`
    - `src/ui/app/modules/index.js`
- Sumber daya bahasa UI:
    - `src/ui/languages/en/strings.xml`
    - `src/ui/languages/de/strings.xml`
    - `src/ui/languages/id/strings.xml`
    - `src/ui/languages/ja/strings.xml`

## Commit

- [5028bb9](https://github.com/le-firehawk/Cognis/commit/5028bb9)
