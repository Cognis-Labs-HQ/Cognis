# Modul Jitsi Meet (Sesi Antar Pengguna)

## Ringkasan

Menambahkan modul mandiri `jitsi-meet` di `src/modules/jitsi-meet` dengan sesi meeting antar dua pengguna, URL dasar Jitsi yang dapat diatur admin, tautan runtime ke room DM native Cognis, dan dukungan Picture-in-Picture melalui Document PiP jika tersedia.

## Berkas / Komponen yang Diubah

- `src/modules/jitsi-meet/api/index.js` — rute API modul untuk pengaturan, pembuatan sesi, dan pre-flight check peserta.
- `src/modules/jitsi-meet/api/store.js` — penyimpanan berbasis DB untuk pengaturan dan entitas meeting dengan kolom FK peserta.
- `src/modules/jitsi-meet/ui/app.js` — logika halaman meeting, pencarian kontak, membuka room, resolusi room chat native, dan aksi PiP.
- `src/modules/jitsi-meet/ui/admin-section.js` — panel pengaturan modul di Administration untuk URL dasar Jitsi.
- `src/modules/jitsi-meet/ui/navbar.js` — kontribusi tautan navbar ke `/meetings`.
- `src/modules/jitsi-meet/languages/*/strings.xml` — string UI lokal untuk modul.
- `src/modules/jitsi-meet/docs/index.*.md` — dokumentasi modul dalam semua bahasa dokumen yang didukung.

## Tautan Commit

- https://github.com/le-firehawk/Cognis/commit/805d8f0
