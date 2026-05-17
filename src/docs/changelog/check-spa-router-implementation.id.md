# Pemeriksaan Router SPA

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

Semua operasi I/O sisi server yang berjalan secara berurutan dalam bootstrap
Study Gateway diparalelkan untuk menghilangkan keterlambatan startup 2–5 detik
yang memblokir Node.js dari menangani permintaan browser. Keempat fase
penemuan dan bootstrap kini menjalankan pekerjaan per-entri secara bersamaan
menggunakan `Promise.all`; dua fase independen (bootstrap adapter dan bootstrap
modul bahasa) kini berjalan secara paralel satu sama lain.

Semua pembacaan berkas dalam `LanguageLibraryStore.#loadDataFiles()`
diparalelkan: semua berkas kelas karakter dibaca secara bersamaan, dan empat
berkas lapisan data (alt-characters, definitions, words, sentences) dimuat
dalam satu panggilan `Promise.all` alih-alih secara berurutan.

Dua panggilan `scanManifestDir` saat startup server di `main.ts` diparalelkan.

Direktori kode mati yang tidak digunakan `ja/library/` telah dihapus, yang
definisi tipe dan re-ekspornya telah digantikan oleh `reuse/library-store.ts`
bersama dan tidak diimpor dari mana pun.

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
- Pembantu respons server bersama yang baru:
    - `src/api/reuse/json-responses.ts` (baru)
    - `src/adapters/study/classes/routes.ts`
    - `src/modules/study/languages/en/index.ts`
    - `src/modules/study/languages/ja/index.ts`
- Utilitas kriptografi sisi klien bersama yang baru:
    - `src/ui/reuse/crypto-utils.js` (baru)
    - `src/adapters/social/messages/ui/app.js`
    - `src/adapters/notify/internal/ui/navbar-plugin.js`
- Utilitas bahasa studi bersama yang baru:
    - `src/modules/study/languages/reuse/language-utils.js` (baru)
    - `src/gateways/study/ui/study.js`
    - `src/modules/study/languages/reuse/study-sub-navigation.js`
- Perbaikan variabel CSS:
    - `src/adapters/notify/internal/ui/notifications.css`
    - `src/gateways/notify/ui/verify-email.css`
- Predikat peran dipindahkan ke `src/ui/reuse/access-role.js`:
    - `src/ui/reuse/access-role.js` — ditambahkan `isAdminScope`, `isTeacherScope`, `isStudentScope`
    - `src/modules/study/languages/reuse/language-utils.js` — sekarang mengekspor ulang dari access-role.js
    - `src/modules/study/languages/reuse/classroom-page.js` — `getRoleFlags()` dihapus
    - `src/adapters/study/classes/ui/app.js` — closure peran lokal dihapus; `renderMemberItems()` diekstrak

- Penemuan rute SPA dinamis untuk halaman milik adapter:
    - `src/api/ui-registry.ts` — registri `SpaRoute` baru (`registerSpaRoute` / `listSpaRoutes`)
    - `src/api/routes/ui/index.ts` — endpoint terautentikasi baru `GET /api/v1/ui/app-routes`
    - `src/ui/reuse/spa-route-registry.js` (baru) — pemuat/cache rute sisi klien
    - `src/ui/reuse/app-router.js` — rute adapter dihapus dari tabel statis; resolusi kini memakai gabungan rute statis + rute terdaftar
    - `src/gateways/social/bootstrap.ts` dan `src/gateways/study/bootstrap.ts` — registrasi rute SPA diteruskan ke konteks bootstrap adapter
    - `src/adapters/social/messages/index.ts`, `src/adapters/social/profile/index.ts`, `src/adapters/study/classes/index.ts` — adapter mendaftarkan rute SPA miliknya sendiri
    - `src/api/tests/ui/ui-registry.test.ts`, `src/api/tests/ui/ui-routes.test.ts`, `src/ui/tests/app-router.test.js` — cakupan pengujian diperbarui untuk registrasi rute modular

## Commit

- [5028bb9](https://github.com/le-firehawk/Cognis/commit/5028bb9)
- [ad0f87b](https://github.com/le-firehawk/Cognis/commit/ad0f87b)
- [903e3f3](https://github.com/le-firehawk/Cognis/commit/903e3f3)
- [1f2451b](https://github.com/le-firehawk/Cognis/commit/1f2451b)
- [18e5b71](https://github.com/le-firehawk/Cognis/commit/18e5b71)
