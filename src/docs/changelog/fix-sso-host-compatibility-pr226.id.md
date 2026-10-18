# Kompatibilitas Host SSO

**Cabang Fitur:** fix-sso-host-compatibility-pr226

## Periksa Ekspor Host Callback

Callback SSO eksternal memerlukan `mountWhenDirect` dan `navigateToDocument` dari `page-entry.js` host. Jalankan `npm run check:ui-host` pada sumber dan `npm run check:ui-build` pada aset hasil build. Setelah penerapan, jalankan `npm run check:ui-host -- --origin https://your-cognis-host.example` dari jaringan yang dapat menjangkau host. Pemeriksaan jarak jauh hanya membaca JavaScript publik, tidak mengirim kredensial, dan mengurai ekspor tanpa menjalankan kode unduhan. Lingkungan proksi dapat mengaktifkan dukungan proksi Node dengan `NODE_USE_ENV_PROXY=1`.

Terapkan Core host yang sesuai sebelum memperbarui modul callback, termasuk aset UI dan manifes aset; mulai ulang proses jika masih memakai rilis sebelumnya. Muat ulang halaman callback hanya setelah pemeriksaan ekspor host publik lulus. Versi modul tidak membuktikan versi aset host yang disajikan. Identitas eksternal yang belum dikenal tetap memerlukan otorisasi pendaftaran ketika pendaftaran publik dinonaktifkan; identitas yang sudah dipetakan tidak mengulangi otorisasi pembuatan akun. HTTP 403 saja tidak mengidentifikasi alasan penolakan: periksa kode kesalahan dan bidang kelanjutan pendaftaran tanpa membagikan kredensial atau kuki.

## Commit

- [dd1b1fa](https://github.com/Cognis-Labs-HQ/Cognis/commit/dd1b1fac635d28ef8ee9f223e86eb41fd3e08120)
