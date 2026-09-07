# Popup Kesalahan Runtime

**Cabang Fitur:** copilot/catch-errors-and-show-popup

## Tangkap Kegagalan Muat Rute

Router SPA sekarang membungkus pemuatan navigasi dengan alur `try/catch/finally`
secara penuh. Saat skrip rute gagal dimuat, overlay loading selalu ditutup agar
pengguna tidak terjebak pada spinner tanpa akhir.

## Tampilkan Detail Debug Siap Lapor

Kegagalan runtime pada dashboard kini membuka popup bahaya yang memuat ringkasan
kesalahan, stack trace, URL halaman, dan keluaran konsol terbaru agar pengguna
dapat langsung menyalin detail untuk laporan bug.

## Komit

- [e4c47c4](https://github.com/Cognis-Labs-HQ/Cognis/commit/e4c47c446cf5d1b5d2eceba77a5e1d796735d84d)
