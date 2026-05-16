# Fondasi Modul Jitsi Meet

## Ringkasan

Menambahkan modul Jitsi Meet baru dengan pengaturan instans yang dapat dikonfigurasi, persistensi rapat, pemeriksaan akses berbasis peserta, API status sesi rapat, halaman Meetings khusus, dan pemantauan administrasi.

Penyempurnaan lanjutan:
- Tata letak halaman Meetings kini sepenuhnya dikendalikan oleh composer: panel peserta berada di atas dengan lebar penuh; Meeting Window dan Chat masing-masing menempati setengah lebar kisi yang tersedia (`gridSize.max: 'half'`).
- "Meeting Overlay" diubah namanya menjadi "Meeting Window" di seluruh antarmuka.
- Tabel "Peserta Tersedia" diisi awal dengan semua pengguna yang terlihat saat halaman dimuat.
- Pencarian peserta diganti dengan popup (sesuai UX "Percakapan Baru" di Pesan).
- Endpoint baru `GET /api/v1/modules/jitsi-meet/participants?q=` menyajikan profil yang terlihat (semua saat `q` kosong; difilter jika tidak).

## Berkas / Komponen yang Diubah

- `src/modules/jitsi-meet/*` (API modul baru, store, UI, i18n, dokumentasi)
- `src/modules/routes/module-extensions.ts` (peningkatan registrasi UI/capability modul)
- `src/api/server.ts` dan `src/api/main.ts` (wiring provider capability modul)
- `src/adapters/social/messages/*` (capability resolusi/penggunaan ulang URL chat grup)
- `src/ui/app/administration/index.js` (dukungan popup konfigurasi modul)
- `src/ui/languages/*/strings.xml` (kunci meeting reusable baru)

## Tautan Commit

- https://github.com/le-firehawk/Cognis/commit/a1a90e53bc3366961181b3cbd4d09094179a463c
- https://github.com/le-firehawk/Cognis/commit/224a1bfb594412391c5dea99962fb9dc8c432396
