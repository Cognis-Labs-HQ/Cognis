# Mode Pengiriman Siaran

**Feature Branch:** copilot/allow-admin-broadcast-options

## Ringkasan

Menambahkan sistem siaran baru yang dapat dikonfigurasi admin pada bagian Notifikasi dengan dua mode tampilan: bilah di bagian atas halaman dan popup. Admin dapat mengatur peran target, tanggal mulai dan selesai, kewajiban konfirmasi, perilaku pengalihan saat ditutup, serta status aktif/nonaktif.

Dashboard sekarang memuat plugin navbar siaran notify yang mengambil siaran aktif berdasarkan peran pengguna yang sedang masuk dan menampilkannya sesuai mode yang dikonfigurasi.

## File / Komponen yang Diubah

- `src/gateways/notify/notification-store.ts` — Menambahkan skema persistensi siaran dan pelacakan status siaran per pengguna.
- `src/gateways/notify/routes/notifications.ts` — Menambahkan API siaran admin/pengguna untuk buat/daftar, aktif/nonaktif, ambil siaran aktif, konfirmasi, dan tutup.
- `src/gateways/notify/ui/admin-section.js` — Menambahkan UI administrasi untuk mengatur dan mengelola siaran.
- `src/gateways/notify/ui/broadcast-navbar-plugin.js` — Plugin dashboard baru untuk menampilkan siaran aktif sebagai bilah atau popup.
- `src/gateways/notify/ui/broadcast.css` — Gaya untuk tampilan bilah siaran.
- `src/gateways/notify/ui/languages/*/strings.xml` — Menambahkan kunci i18n siaran pada semua bahasa yang didukung.
- `src/gateways/notify/bootstrap.ts` — Mendaftarkan plugin navbar siaran dan menaikkan versi registry gateway.
- `src/gateways/notify/manifest.json` dan `src/docs/versions.en.md` — Menaikkan versi Notification gateway menjadi `1.4.0`.
- `src/gateways/notify/routes/tests/notification-routes.test.ts` — Menambahkan pengujian rute untuk endpoint siaran baru.

## Commit

- https://github.com/Cognis-Labs-HQ/Cognis/commit/e14cbfc
