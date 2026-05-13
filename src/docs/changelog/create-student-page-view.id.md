# Keanggotaan Kelas Siswa & Manajemen Kelas Pengajar

## Ringkasan

Menambahkan halaman Kelas Saya di `/my-classes` khusus siswa untuk melihat kelas yang diikuti, mengajukan permintaan bergabung ke kelas yang tersedia, dan meninggalkan kelas. Halaman kelas pengajar ditingkatkan dengan filter bahasa, manajemen siswa per kelas, pencarian siswa, serta kemampuan mengundang siswa dan menyetujui atau menolak permintaan bergabung.

Selain itu, bagian Studi di Pengaturan Pengguna digantikan dengan halaman hub `/study` tersendiri. Tombol Belajar di bilah navigasi kini langsung menuju `/study`. Halaman baru menampilkan layar sambutan animasi untuk pengguna baru dan hub bahasa dengan tautan ke modul studi terdaftar.

Label peran di halaman Pengguna dan Dasbor kini sepenuhnya terlokalisasi.

## File / Komponen yang Diubah

- `src/adapters/study/classes/store.ts` — Ditambahkan tabel `class_memberships` dan metode store untuk alur pendaftaran siswa
- `src/adapters/study/classes/routes.ts` — Ditambahkan endpoint API manajemen kelas siswa dan pengajar
- `src/adapters/study/classes/index.ts` — Ditambahkan rute halaman `/my-classes`; kapabilitas `accountExists` dihubungkan
- `src/adapters/study/classes/ui/my-classes.html` — HTML halaman siswa baru
- `src/adapters/study/classes/ui/my-classes.js` — JavaScript halaman siswa baru
- `src/adapters/study/classes/ui/app.js` — Tampilan pengajar ditingkatkan dengan filter bahasa dan manajemen siswa
- `src/adapters/study/classes/ui/classes.css` — Gaya ditambahkan untuk elemen UI baru
- `src/gateways/study/ui/classes-dashboard-element.js` — Elemen dashboard siswa ditambahkan
- `src/gateways/study/bootstrap.ts` — Pendaftaran bagian pengaturan dihapus; rute `/study` ditambahkan; versi dinaikkan ke 1.3.0
- `src/gateways/study/manifest.json` — Versi dinaikkan ke 1.3.0
- `src/gateways/study/ui/navbar.js` — Disederhanakan menjadi tautan navigasi biasa; handler popup dihapus
- `src/gateways/study/ui/study.html` — Shell HTML baru untuk halaman `/study`
- `src/gateways/study/ui/study.js` — Modul halaman hub belajar baru menggunakan `createPageComposer`
- `src/gateways/study/ui/study.css` — CSS baru untuk hub belajar dan layar sambutan
- `src/gateways/study/ui/languages/*/strings.xml` — String halaman `gateway.study.*` baru (semua 4 bahasa)
- `src/ui/reuse/app-router.js` — Rute `/study` ditambahkan
- `src/ui/layouts/dashboard-layout.js` — Pintasan studi diperbarui ke `/study`
- `src/ui/styles/settings.css` — Kelas CSS studi yang tidak terpakai dihapus
- `src/ui/languages/*/strings.xml` — Kunci `ui.reuse.role_*` ditambahkan; `ui.app.settings.study.*` dipulihkan (semua 4 bahasa)
- `src/ui/app/users/index.js` — Label peran kini menggunakan kunci i18n
- `src/ui/app/dashboard/index.js` — Tampilan peran kini menggunakan kunci i18n
- `src/adapters/study/classes/package.json` — Versi ditingkatkan ke 1.2.0
- `src/docs/versions.en.md` — Versi komponen diperbarui

## Commit

Lihat branch `copilot/create-student-page-view` untuk riwayat commit.
