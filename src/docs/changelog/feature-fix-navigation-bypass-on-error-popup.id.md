# Navigasi Popup Galat

**Feature Branch:** feature-fix-navigation-bypass-on-error-popup

## Crash setelah pemuatan tetap di halaman

Menutup popup galat runtime tidak lagi memindahkan pengguna dari halaman yang sudah berhasil dimuat sebelum tombol atau tindakan setelah pemuatan mengalami crash. Kegagalan pemuatan dan pemasangan rute tetap mengembalikan pengguna ke rute sebelumnya bila diperlukan.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/dfb83b1d6e8faa104500cf75a9856c8c7a210511
