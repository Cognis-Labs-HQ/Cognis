# Popup galat yang andal selama gangguan layanan

**Feature Branch:** feature-fix-error-popup-rendering-on-service-restart

## Popup galat tetap terbaca saat Cognis dimulai ulang

Cognis kini menyimpan stylesheet popup lengkap di Cache Storage sementara milik peramban selagi layanan merespons. Jika server sementara tidak tersedia selama proses mulai ulang, dialog galat runtime menggunakan stylesheet tersimpan tersebut alih-alih tampil sebagai konten halaman tanpa gaya.

## Commits

- [dc87c30](https://github.com/Cognis-Labs-HQ/Cognis/commit/dc87c30f1621b82081ff176cf15f2df337df3f14)
