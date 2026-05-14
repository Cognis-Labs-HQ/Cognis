# Changelog PR — Periksa Implementasi Router SPA

## Ringkasan

Menyelesaikan pass konsistensi SPA pada entrypoint halaman dengan menambahkan
cakupan router untuk halaman Undangan serta menyelaraskan pola `mount()` +
direct-load guard pada halaman autentikasi dan undangan.

Metadata komposer login/registrasi juga disesuaikan agar memenuhi kebutuhan
`pageContext` (judul + subjudul), dan render daftar modul diperbaiki untuk
layar kecil dengan container tabel responsif.

Tindak lanjutnya juga menghapus pekerjaan shell yang memblokir render awal:
template dashboard kini dipanaskan lebih awal, pemuatan plugin navbar ditunda,
dan konten halaman tidak lagi menunggu preferensi layout tersimpan selesai
dimuat sebelum paint pertama.

Kolom `subtitle` yang hilang pada `pageContext` halaman adapter Pesan, Kelas,
dan Kelas Saya ditambahkan sehingga sepenuhnya mematuhi instruksi AI yang
mengharuskan setiap konteks halaman memiliki judul dan subjudul yang diselesaikan
melalui kunci i18n.

Komponen studi Alfabet Hiragana diperbaiki: tidak ada `componentStringBaseUrls`
dalam panggilan `createI18n` (string gateway tidak pernah dimuat), judul halaman
berbahasa Inggris yang dikodekan secara langsung, tidak ada subjudul, serta
string Inggris yang dikodekan langsung pada label elemen dan konten render.
Semua masalah ini kini diselesaikan melalui namespace i18n `gateway.study.*`.

Judul halaman yang dikodekan langsung pada komponen Alfabet Bahasa Inggris juga
diperbaiki dengan cara yang sama.

Semua kunci i18n yang sesuai ditambahkan untuk empat bahasa yang didukung
(de, en, id, ja): tiga kunci subjudul baru per bahasa pada file `strings.xml`
global, dan lima kunci baru per bahasa pada file `strings.xml` gateway study.

## Komponen dan berkas yang diubah

- Router dan pengujian SPA:
    - `src/ui/reuse/app-router.js`
    - `src/ui/tests/app-router.test.js`
- Performa shell/layout:
    - `src/ui/layouts/dashboard-layout.js`
    - `src/ui/reuse/page-composer.js`
    - `src/ui/tests/page-composer-refresh.test.js`
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
