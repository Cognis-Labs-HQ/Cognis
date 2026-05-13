# Halaman Hub Belajar dan Penghapusan Pengaturan

## Ringkasan

Bagian Studi di Pengaturan Pengguna digantikan dengan halaman `/study` yang tersendiri. Tombol navigasi Belajar kini langsung menuju `/study` tanpa membuka popup. Halaman baru menampilkan layar sambutan animasi saat belum ada bahasa yang dipilih, dan hub studi dengan tautan ke modul terdaftar setelah bahasa dipilih.

## File / Komponen yang Diubah

- `src/gateways/study/bootstrap.ts` — Pendaftaran bagian pengaturan dihapus; rute halaman `/study` ditambahkan; versi dinaikkan ke 1.3.0
- `src/gateways/study/manifest.json` — Versi dinaikkan ke 1.3.0
- `src/gateways/study/ui/study-prefs.js` — Dihapus (tidak lagi direferensikan setelah bagian pengaturan dihapus)
- `src/gateways/study/ui/navbar.js` — Disederhanakan menjadi tautan navigasi biasa; handler popup dihapus
- `src/gateways/study/ui/study.html` — Shell HTML baru untuk halaman `/study`
- `src/gateways/study/ui/study.js` — Modul halaman hub belajar baru menggunakan `createPageComposer`
- `src/gateways/study/ui/study.css` — CSS baru untuk hub belajar dan layar sambutan
- `src/ui/reuse/app-router.js` — Rute `/study` ditambahkan
- `src/ui/layouts/dashboard-layout.js` — Pintasan studi diperbarui ke `/study`
- `src/ui/styles/settings.css` — Kelas CSS studi yang tidak terpakai dihapus
- `src/ui/languages/*/strings.xml` — Kunci `ui.app.settings.study.*` diganti dengan `ui.app.study.*`; `ui.page.title.study` ditambahkan (semua 4 bahasa)
- `src/docs/versions.en.md` — Versi Study Gateway diperbarui ke 1.3.0

## Commit

- https://github.com/le-firehawk/Cognis/commit/1170b58
