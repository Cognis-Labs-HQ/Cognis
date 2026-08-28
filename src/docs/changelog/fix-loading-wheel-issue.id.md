# Perbaikan Animasi Loading

**Feature Branch:** copilot/fix-loading-wheel-issue

## Animasi loading tidak lagi muncul di atas popup konfirmasi kata sandi

Overlay pemuatan halaman kini disembunyikan saat popup sedang terbuka, sehingga tidak menutupi konfirmasi kata sandi dan prompt interaktif lainnya yang muncul selama pemuatan halaman.

## Input kata sandi kini terbungkus dalam elemen form

Input kata sandi di dalam popup konfirmasi ulang kini dibungkus dalam elemen `<form>`, menghilangkan peringatan browser tentang kolom kata sandi yang tidak terdapat dalam form.

## Commits

- [8058581](https://github.com/Cognis-Labs-HQ/Cognis/commit/805858123bc36713ef78b0f6ee038fdf3613782a)
