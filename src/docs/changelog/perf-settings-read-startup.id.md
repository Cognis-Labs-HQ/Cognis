# Pengaturan Lebih Cepat

**Cabang Fitur:** perf-settings-read-startup

## Tumpang Tindih Pembacaan Mandiri

Pengaturan memuat preferensi akun, persetujuan editor, dan status penyiapan secara bersamaan. Setelah memeriksa pengalihan penyiapan, deskriptor bagian dimuat bersamaan dengan lokalisasi. Setiap pemasangan tetap meminta data terkini; tidak ada cache baru untuk preferensi atau respons pribadi.

## Pertahankan Aturan Bahasa

Preferensi bahasa tersimpan diterapkan sebelum lokalisasi dimulai. Pengalihan penyiapan wajib selesai sebelum penemuan bagian atau tampilan. Uji perilaku menjalankan inisialisasi pemasangan yang sebenarnya melalui kontrak dependensi eksplisit dan memeriksa pergantian akun berulang.

## Komit

- [e3009a41720815529c21c9e7c041e4653c8f5df9](https://github.com/Cognis-Labs-HQ/Cognis/commit/e3009a41720815529c21c9e7c041e4653c8f5df9)
