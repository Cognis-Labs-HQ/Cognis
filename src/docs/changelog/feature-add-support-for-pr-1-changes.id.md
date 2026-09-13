# Integrasi Pendaftaran

**Cabang Fitur:** feature-add-support-for-pr-1-changes

## Penyimpanan dokumen berversi

Core kini menyediakan penyimpanan versi dokumen netral berbasis basis data yang hanya dapat ditambahkan untuk modul yang dikirimkan secara mandiri. Arsip Dokumentasi dan Catatan Perubahan yang ada tetap menggunakan snapshot sistem berkas multibahasa berversi komponen karena mengubah sumber statis tersebut menjadi rekaman basis data hanya akan menggandakan penyimpanan tanpa memperbaiki model versinya.

## Ekstensi pendaftaran

Alur pendaftaran milik host kini menyusun bidang modul, memvalidasi nilainya, dan menyelesaikan pekerjaan pendaftaran terautentikasi sebelum navigasi.

## Fallback gambar modul

Ikon dan banner modul yang rusak atau tidak valid kini beralih ke gambar standar modul tidak dikenal tanpa membuka popup galat runtime.

## Kapabilitas navigasi host

Siklus hidup modul kini mengenali router aplikasi sebagai penyedia `ui:navigate`, sehingga modul yang memerlukan navigasi host dapat diaktifkan.

## Pemuatan kontribusi yang aman

Administrasi kini mengimpor modul UI kontribusi di bawah pelindung SPA, sehingga titik masuk halaman tidak memasang dirinya sendiri pada URL Administrasi.

## Fallback gambar yang tangguh

Gambar modul kini menggunakan rute aset fallback publik kanonis; fallback yang tidak tersedia disembunyikan tanpa membuka popup galat runtime.

## Komposisi pendaftaran yang andal

Alur pendaftaran kini mengikuti aturan penamaan camel case untuk ctx, mengisolasi hook integrasi yang rusak agar pendaftaran dasar tetap tersedia, serta mendokumentasikan label HTML tepercaya bagi kontributor.

## Commit

- [2f77a92](https://github.com/Cognis-Labs-HQ/Cognis/commit/2f77a92c78df6da12b4c000b47b2c787ab517695)
- [8b480faf](https://github.com/Cognis-Labs-HQ/Cognis/commit/8b480fafbceca1dd52b9c693dc1f0d4381d473b8)
- [84f84a43](https://github.com/Cognis-Labs-HQ/Cognis/commit/84f84a43659185eb65e48004cc9a898b69aa4458)
- [2ad50da](https://github.com/Cognis-Labs-HQ/Cognis/commit/2ad50dacc8f0a73aa965b85410054a881a05cd17)
- [1b13f90](https://github.com/Cognis-Labs-HQ/Cognis/commit/1b13f90326737588d470ac1e4919e36ed9fba4dd)
- [082e5f2](https://github.com/Cognis-Labs-HQ/Cognis/commit/082e5f2ab7fc36c948c2da97539d1b56cd7fdae0)
- [2be280e](https://github.com/Cognis-Labs-HQ/Cognis/commit/2be280efacce0abf81d80ad3aae9bd23c8db921a)
- [fb19c34e](https://github.com/Cognis-Labs-HQ/Cognis/commit/fb19c34e1ad6b7de4b7c0dd2c6bb8e0fad171484)
- [3f80ad56](https://github.com/Cognis-Labs-HQ/Cognis/commit/3f80ad56eb500d81031d7c3001bc1b5c246f84a1)
- [8f67ef9e](https://github.com/Cognis-Labs-HQ/Cognis/commit/8f67ef9eb42910f9597f694d2d7b819b1ab00940)
