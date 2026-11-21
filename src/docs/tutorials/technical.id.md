# Referensi Teknis

Antarmuka publik dan aturan operasional Tutorial Terpandu.

## Antarmuka

Komponen memperoleh `ui:tutorials` melalui ctx peramban. Host memasang lewat installTutorials; tindakan memakai alur `ui:tutorial:*`. Page Composer menyumbang panduan halaman tanpa impor internal.

## Konfigurasi

Panduan mendeklarasikan ID pemilik/panduan/langkah stabil, terjemahan, halaman, target, dan highlightNext. Cabang opsional memakai targetAvailable serta sinyal pembukaan; panduan bahasa perlu pendaftaran.

## Perilaku

Penemuan halaman menunggu status akun dan melewati panduan selesai. Pemutaran ulang tidak menghapus penyelesaian. Kembali dan Mulai Ulang mempertahankan contoh; pembatalan dan unmount membersihkan target. Penyelesaian diakui setelah tersimpan.

## Keamanan

Visibilitas dan kondisi mengikuti peran serta akses. Kegagalan membaca penyelesaian adalah galat, bukan izin memutar otomatis; kemajuan disimpan per akun terautentikasi.

## Referensi

- [src/ui/reuse/tutorials/index.js](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/ui/reuse/tutorials/index.js)
- [src/ui/reuse/tutorials/runtime.js](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/ui/reuse/tutorials/runtime.js)
