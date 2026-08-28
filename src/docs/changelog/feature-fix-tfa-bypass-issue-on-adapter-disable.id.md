# Bypass login saat adaptor TFA dinonaktifkan

**Feature Branch:** feature-fix-tfa-bypass-issue-on-adapter-disable

## Adaptor TFA nonaktif tidak lagi memblokir login

Saat administrator menonaktifkan adaptor TFA yang sebelumnya dikonfigurasi pengguna, login kini menganggap metode tersebut tidak tersedia untuk penerapan dan melewati TFA alih-alih mengembalikan galat sementara tidak tersedia.

## Commits

- [5b67ac9](https://github.com/Cognis-Labs-HQ/Cognis/commit/5b67ac95fe2b594f8b76c38d73dfdf5adf945dbf)
