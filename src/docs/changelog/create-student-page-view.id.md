# Keanggotaan Kelas Siswa, Manajemen Kelas Pengajar & Hub Belajar

## Ringkasan

Menambahkan halaman Kelas Saya di `/my-classes` khusus siswa untuk melihat kelas yang diikuti, mengajukan permintaan bergabung ke kelas yang tersedia, dan meninggalkan kelas. Halaman kelas pengajar ditingkatkan dengan filter bahasa, manajemen siswa per kelas, pencarian siswa, serta kemampuan mengundang siswa dan menyetujui atau menolak permintaan bergabung.

Bagian Studi di Pengaturan Pengguna digantikan oleh hub belajar di `/study`. Layar sambutan satu kali di `/study/welcome` memungkinkan pengguna baru memilih bahasa dari modul bahasa yang terdaftar (misalnya bahasa Jepang). Setelah pengenalan selesai, pengguna masuk ke hub dengan baris sub-navigasi baru yang dikelola composer tepat di bawah navigasi global. Baris ini berbeda dari toolbar samping, diisi dinamis dari child UI modul bahasa, dan memakai `/study/settings` untuk pengaturan bahasa. Daftar bahasa berasal langsung dari study gateway (modul terdaftar).

Label peran di halaman Pengguna dan Dasbor kini sepenuhnya terlokalisasi.

## File / Komponen yang Diubah

- `src/adapters/study/classes/store.ts` — Ditambahkan tabel `class_memberships` dan metode store untuk alur pendaftaran siswa
- `src/adapters/study/classes/routes.ts` — Ditambahkan endpoint API manajemen kelas siswa dan pengajar
- `src/adapters/study/classes/index.ts` — Ditambahkan rute halaman `/my-classes`; kapabilitas `accountExists` dihubungkan
- `src/adapters/study/classes/ui/my-classes.html` — HTML halaman siswa baru
- `src/adapters/study/classes/ui/my-classes.js` — JavaScript halaman siswa baru
- `src/adapters/study/classes/ui/app.js` — Tampilan pengajar ditingkatkan dengan filter bahasa dan manajemen siswa
- `src/adapters/study/classes/ui/classes.css` — Gaya ditambahkan untuk elemen UI baru
- `src/gateways/study/gateway.ts` — Metode `listRegisteredLanguages()` ditambahkan
- `src/gateways/study/bootstrap.ts` — Rute `/study/welcome`, `/study`, dan `/study/settings` (HTML bersama); endpoint `GET /api/v1/study/registered-languages` ditambahkan; versi dinaikkan ke 1.4.0
- `src/gateways/study/manifest.json` — Versi dinaikkan ke 1.4.0
- `src/gateways/study/ui/classes-dashboard-element.js` — Elemen dashboard siswa ditambahkan
- `src/gateways/study/ui/navbar.js` — Disederhanakan menjadi tautan navigasi biasa; handler popup dihapus
- `src/gateways/study/ui/study.html` — Shell HTML untuk `/study` dan `/study/welcome`
- `src/gateways/study/ui/study.js` — Ditulis ulang: onboarding satu kali (`/study/welcome`), dashboard (`/study`), pengaturan (`/study/settings`), sub-item navigasi berbasis modul, dan dropdown bahasa aktif di sub-navigasi
- `src/gateways/study/ui/study.css` — Gaya diperbarui: tata letak sub-navigasi modul, dropdown bahasa aktif, dan panel pengaturan bahasa 50/50
- `src/gateways/study/ui/languages/*/strings.xml` — Kunci `gateway.study.available_languages` dan `gateway.study.active_languages` ditambahkan (semua 4 bahasa)
- `src/ui/reuse/app-router.js` — Hanya `/study`, `/study/welcome`, dan `/study/settings` diarahkan ke hub belajar; halaman modul tetap memakai handler sendiri
- `src/ui/reuse/page-composer.js` — Menambahkan slot sub-navigasi composer yang terpisah dari toolbar samping
- `src/ui/layouts/dashboard-layout.js` — Menambahkan wiring slot layout `subNavigation`
- `src/ui/public/templates/dashboard-layout.html` — Menambahkan placeholder baris sub-navigasi di bawah navigasi global
- `src/ui/styles/reuse/layout.css` — Menambahkan gaya global untuk baris sub-navigasi composer baru
- `src/ui/layouts/dashboard-layout.js` — Pintasan studi diperbarui ke `/study`
- `src/ui/styles/settings.css` — Kelas CSS studi yang tidak terpakai dihapus
- `src/ui/languages/*/strings.xml` — Kunci `ui.reuse.role_*` ditambahkan; `ui.app.settings.study.*` dipulihkan (semua 4 bahasa)
- `src/ui/app/users/index.js` — Label peran kini menggunakan kunci i18n
- `src/ui/app/dashboard/index.js` — Tampilan peran kini menggunakan kunci i18n
- `src/adapters/study/classes/package.json` — Versi ditingkatkan ke 1.2.0
- `src/docs/versions.en.md` — Versi komponen diperbarui

## Commit

Lihat branch `copilot/create-student-page-view` untuk riwayat commit.
