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
- `src/gateways/study/gateway.ts` — Menambahkan metadata modul bahasa dan informasi status aktif pada registrasi modul bahasa
- `src/gateways/study/bootstrap.ts` — Rute `/study/welcome`, `/study`, dan `/study/settings` (HTML bersama); endpoint `GET /api/v1/study/registered-languages` ditambahkan; daftar bahasa dan route child kini difilter berdasarkan status aktif modul
- `src/gateways/study/manifest.json` — Versi dinaikkan ke 1.4.0
- `src/gateways/study/ui/classes-dashboard-element.js` — Elemen dashboard siswa ditambahkan
- `src/gateways/study/ui/navbar.js` — Disederhanakan menjadi tautan navigasi biasa; handler popup dihapus; mengambil bahasa terdaftar saat dimuat dan menonaktifkan tautan jika tidak ada bahasa yang tersedia
- `src/ui/styles/reuse/layout.css` — Menambahkan aturan `.topnav a[aria-disabled="true"]` untuk meredup dan menonaktifkan klik pada item navigasi yang dinonaktifkan
- `src/gateways/study/ui/study.html` — Shell HTML untuk `/study` dan `/study/welcome`
- `src/gateways/study/ui/study.js` — Ditulis ulang: onboarding satu kali (`/study/welcome`), dashboard (`/study`), pengaturan (`/study/settings`), sub-item navigasi berbasis modul, dan dropdown bahasa aktif di sub-navigasi
- `src/gateways/study/ui/study.css` — Gaya diperbarui: tata letak sub-navigasi modul, dropdown bahasa aktif, dan panel pengaturan bahasa 50/50
- `src/gateways/study/ui/languages/*/strings.xml` — Kunci `gateway.study.available_languages` dan `gateway.study.active_languages` ditambahkan (semua 4 bahasa)
- `src/ui/reuse/app-router.js` — Hanya `/study`, `/study/welcome`, dan `/study/settings` diarahkan ke hub belajar; halaman modul tetap memakai handler sendiri
- `src/ui/reuse/page-composer.js` — Menambahkan slot sub-navigasi composer yang terpisah dari toolbar samping
- `src/ui/layouts/dashboard-layout.js` — Menambahkan wiring slot layout `subNavigation`
- `src/ui/public/templates/dashboard-layout.html` — Menambahkan placeholder baris sub-navigasi di bawah navigasi global
- `src/modules/study/languages/ja/components/hiragana-alphabet/ui/index.html` — Menambahkan stylesheet global (`page-builder.css`, `reuse/page-sections.css`, `study.css`) dan boilerplate meta PWA lengkap agar halaman tampil benar saat hard refresh
- `src/modules/study/languages/ja/components/library/ui/index.html` — Sama: stylesheet global dan boilerplate PWA ditambahkan; atribut `lang` dikoreksi dari `en` ke `ja`
- `src/modules/study/languages/en/components/alphabet/ui/index.html` — Sama: stylesheet global dan boilerplate PWA ditambahkan
- `src/ui/layouts/dashboard-layout.js` — Render pertama dan reuse shell kini menambahkan atau menghapus elemen `.page-subnav` alih-alih mengubah atribut `hidden`, mengikuti pola yang sama dengan toolbar, footer, dan header
- `src/ui/styles/reuse/layout.css` — `.site-header` sekarang menggunakan `position: sticky; top: 0; z-index: 1200` sehingga seluruh header (topbar + navrow + sub-navigasi) langsung menempel di atas saat digulir; deklarasi `position: sticky`, `top`, dan `z-index` yang berlebihan dihapus dari `.global-navrow` dan breakpoint responsif
- `src/ui/languages/*/strings.xml` — Kunci `ui.reuse.role_*` ditambahkan; `ui.app.settings.study.*` dipulihkan (semua 4 bahasa)
- `src/ui/app/users/index.js` — Label peran kini menggunakan kunci i18n
- `src/ui/app/dashboard/index.js` — Tampilan peran kini menggunakan kunci i18n
- `src/adapters/study/classes/package.json` — Versi ditingkatkan ke 1.2.0
- `src/docs/versions.en.md` — Versi komponen diperbarui
- `src/gateways/study/tests/bootstrap.test.ts` — Menambahkan tes gateway untuk ingest modul Jepang saat dinonaktifkan/diaktifkan

- `src/gateways/study/bootstrap.ts` — Pemeriksaan langsung tabel modul diganti dengan ingest status ketersediaan milik Study melalui capability `study:setLanguageModuleEnabled`
- `src/gateways/study/gateway.ts` — Menambahkan state ketersediaan modul bahasa di dalam gateway untuk memfilter daftar bahasa dan route child
- `src/api/server.ts` dan `src/api/main.ts` — Siklus enable/disable modul dan pemulihan state saat startup kini mendorong status modul bahasa ke Study gateway
- `src/gateways/study/manifest.json` dan `src/docs/versions.en.md` — Versi Study gateway dinaikkan ke 1.5.0

- `src/gateways/study/ui/study.js` — Pemanggilan mount top-level untuk direct-load kini dibungkus try/catch agar kegagalan impor SPA Study tercatat dengan aman
- `src/adapters/study/classes/ui/my-classes.js` — Pemanggilan mount top-level untuk direct-load kini dibungkus try/catch agar impor SPA lebih tangguh
- `src/ui/reuse/app-router.js` — Penamaan variabel path yang sudah dibersihkan diperjelas pada logika pencocokan route

- `src/gateways/study/ui/study.js` dan `src/gateways/study/ui/study.css` — Teks "Bahasa Aktif" di subnavigasi Study dihapus, opsi bahasa ditampilkan langsung, dan ikon pengaturan dipindah ke kanan opsi bahasa
- `src/gateways/study/ui/study.js` dan `src/gateways/study/ui/languages/*/strings.xml` — Menambahkan popup peringatan konfirmasi sebelum menghapus bahasa belajar aktif terakhir, lalu diarahkan ke `/study/welcome` setelah konfirmasi
- `src/modules/study/languages/ja/index.ts` — Route child modul Jepang kini difront oleh gateway pada URL generik (`/study/hiragana`, `/study/library`)
- `src/modules/study/languages/ja/components/*/ui/app.js` — Halaman modul bahasa Jepang diubah ke entry SPA `mount()` yang diekspor dengan `createPageComposer` dan struktur halaman bersama
- `src/ui/reuse/app-router.js` — Menambahkan routing SPA untuk `/study/hiragana` dan `/study/library`
- `src/modules/study/languages/ja/{package.json,manifest.json}` dan `src/docs/versions.en.md` — Versi modul Cognis Japanese dinaikkan ke `1.1.2`

- `src/ui/styles/reuse/layout.css` — Menghapus `flex: 1 0 auto` dari `.workspace` agar ukurannya menyesuaikan konten dan tidak memenuhi viewport; `.global-footer` diberi `margin: auto auto 0` agar footer terdorong ke dasar viewport melalui margin atas otomatis dalam kolom flex; latar belakang `.page-subnav` kini menggunakan `var(--nav-bg)` secara langsung (sama seperti `.global-navrow`) dan ditambahkan `backdrop-filter: blur(8px)` agar bilah tetap sepenuhnya buram saat konten di bawahnya digulir
- `src/ui/styles/reuse/layout.css` dan `src/ui/layouts/dashboard-layout.js` — Mengurangi padding vertikal subnavigasi, mengembalikan sudut membulat di semua sisi, dan menambahkan status gulir untuk halaman yang memiliki subnavigasi sehingga bar navigasi utama melipat setelah pengguna mulai menggulir dan subnavigasi tersambung langsung ke topbar global
- `src/ui/layouts/dashboard-layout.js`, `src/ui/styles/reuse/layout.css`, `src/gateways/study/ui/study.css`, dan berkas subnavigasi halaman anak Study — Menjaga item navbar global Study tetap aktif pada subhalaman Study, menghapus celah serta pemisahan radius antara navbar utama dan subnavigasi Study saat berada di bagian atas halaman, dan menyamakan gaya tautan modul Study dengan navbar global sambil membiarkan tombol pemilih bahasa tetap seperti semula

## Commit

Lihat branch `copilot/create-student-page-view` untuk riwayat commit.

- `src/adapters/study/classes/{store.ts,routes.ts,package.json}`, `src/modules/study/languages/{en,ja}/index.ts`, berkas UI classroom bahasa baru, aset reuse Study, berkas UI/store Library Study, berkas bahasa gateway Study, dokumentasi, dan instruksi Copilot — Menambahkan halaman classroom per bahasa dengan visualisasi kursi dan perilaku berbasis peran guru/siswa, menambahkan API pengelolaan layout/anggota classroom, menampilkan akses Library admin pada subnavigasi Study tanpa tergantung bahasa terpilih (dengan propagasi filter bahasa), serta memperluas dokumentasi dan panduan Library/Classroom
