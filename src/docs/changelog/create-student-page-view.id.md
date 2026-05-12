# Keanggotaan Kelas Siswa & Manajemen Kelas Pengajar

## Ringkasan

Menambahkan halaman Kelas Saya di `/my-classes` khusus siswa untuk melihat kelas yang diikuti, mengajukan permintaan bergabung ke kelas yang tersedia, dan meninggalkan kelas. Halaman kelas pengajar ditingkatkan dengan filter bahasa, manajemen siswa per kelas, pencarian siswa, serta kemampuan mengundang siswa dan menyetujui atau menolak permintaan bergabung.

## File / Komponen yang Diubah

- `src/adapters/study/classes/store.ts` — Ditambahkan tabel `class_memberships` dan metode store untuk alur pendaftaran siswa
- `src/adapters/study/classes/routes.ts` — Ditambahkan endpoint API manajemen kelas siswa dan pengajar
- `src/adapters/study/classes/index.ts` — Ditambahkan rute halaman `/my-classes`; kapabilitas `accountExists` dihubungkan
- `src/adapters/study/classes/ui/my-classes.html` — HTML halaman siswa baru
- `src/adapters/study/classes/ui/my-classes.js` — JavaScript halaman siswa baru
- `src/adapters/study/classes/ui/app.js` — Tampilan pengajar ditingkatkan dengan filter bahasa dan manajemen siswa
- `src/adapters/study/classes/ui/classes.css` — Gaya ditambahkan untuk elemen UI baru
- `src/gateways/study/ui/classes-dashboard-element.js` — Elemen dashboard siswa ditambahkan
- `src/ui/languages/*/strings.xml` — String i18n baru (semua 4 bahasa)
- `src/adapters/study/classes/package.json` — Versi ditingkatkan ke 1.2.0
- `src/docs/versions.en.md` — Versi komponen diperbarui

## Commit

Lihat branch `copilot/create-student-page-view` untuk riwayat commit.
