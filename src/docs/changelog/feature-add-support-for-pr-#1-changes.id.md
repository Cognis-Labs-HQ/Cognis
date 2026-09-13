# Integrasi Pendaftaran

**Cabang Fitur:** feature-add-support-for-pr-#1-changes

## Penyimpanan dokumen berversi

Core kini menyediakan kapabilitas versi dokumen berbasis basis data yang hanya dapat ditambahkan untuk modul yang dikirimkan secara mandiri.

## Ekstensi pendaftaran

Alur pendaftaran milik host kini menyusun bidang modul, memvalidasi nilainya, dan menyelesaikan pekerjaan pendaftaran terautentikasi sebelum navigasi.

## Fallback gambar modul

Ikon dan banner modul yang rusak atau tidak valid kini beralih ke gambar standar modul tidak dikenal tanpa membuka popup galat runtime.

## Kapabilitas navigasi host

Siklus hidup modul kini mengenali router aplikasi sebagai penyedia `ui:navigate`, sehingga modul yang memerlukan navigasi host dapat diaktifkan.

## Pemuatan kontribusi yang aman

Administrasi kini mengimpor modul UI kontribusi di bawah pelindung SPA, sehingga titik masuk halaman tidak memasang dirinya sendiri pada URL Administrasi.

## Commit

- [9d24852](https://github.com/Cognis-Labs-HQ/Cognis/commit/9d248526)
- [8b480faf](https://github.com/Cognis-Labs-HQ/Cognis/commit/8b480fafbceca1dd52b9c693dc1f0d4381d473b8)
- [84f84a43](https://github.com/Cognis-Labs-HQ/Cognis/commit/84f84a43659185eb65e48004cc9a898b69aa4458)
- [2ad50da](https://github.com/Cognis-Labs-HQ/Cognis/commit/2ad50dacc8f0a73aa965b85410054a881a05cd17)
- [1b13f90](https://github.com/Cognis-Labs-HQ/Cognis/commit/1b13f90326737588d470ac1e4919e36ed9fba4dd)
- [082e5f2](https://github.com/Cognis-Labs-HQ/Cognis/commit/082e5f2ab7fc36c948c2da97539d1b56cd7fdae0)
