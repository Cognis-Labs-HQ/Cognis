# Tata letak edit page composer yang stabil

**Feature Branch:** feature-fix-element-placement-in-edit-mode

## Mode edit memakai dimensi mode normal

Overlay edit page composer kini mengukur kolomnya dari dimensi bagian konten yang sama dengan mode normal, sementara tinggi baris tetap terikat pada ukuran baris mode normal. Elemen bermedia seperti iframe, gambar, video, audio, konten canvas, konten object/embed, dan elemen yang secara eksplisit dipertahankan tetap berada di kartu yang sudah ada sementara kontrol edit dilapiskan di sekelilingnya, sehingga iframe tidak dipindahkan ulang dan jendela tertanam seperti meeting aktif tidak dipaksa memuat ulang. Komponen tetap dapat keluar dengan `data-composer-preserve="false"` saat wrapper API-nya harus mengelola pemulihan sendiri.

## Perlindungan penyegaran saat meeting

Meeting aktif tetap memakai konfirmasi unload browser untuk upaya penyegaran atau navigasi yang sebenarnya, tetapi Cognis tidak lagi mengubah status pemuatan bersama selama `beforeunload`. Overlay pemuatan kini menunggu `pagehide`, sehingga membatalkan prompt penyegaran browser membuat halaman meeting dan sesi tertanam tetap terlihat serta interaktif.

## Commits

- [fa6742a](https://github.com/Cognis-Labs-HQ/Cognis/commit/fa6742a49a2e6f0284b44c84dec7ca4d7b503ac0)
