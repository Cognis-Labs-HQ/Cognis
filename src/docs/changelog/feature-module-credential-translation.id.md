# Katalog Kredensial Terkini

**Cabang Fitur:** feature-module-credential-translation

## Perbarui terjemahan sebelum digunakan

Katalog terjemahan host pada URL bahasa yang dapat berubah kini menunggu penyegaran jaringan bersama sebelum ditampilkan. Kegagalan jaringan atau batas waktu empat detik yang sudah ada mempertahankan katalog cache jika tersedia. Katalog dengan hash konten tetap mengutamakan cache; aset publik lain mempertahankan kebijakan penyegarannya.

## Pertahankan bantuan kredensial lokal

Formulir sumber modul mempertahankan panduan kredensial dalam bahasa Inggris, Jerman, Indonesia, dan Jepang. Nilai bahasa pilihan yang tidak tersedia memakai bahasa Inggris; nilai bahasa Inggris yang hilang tetap menimbulkan kesalahan eksplisit. Pengujian regresi mencakup perpindahan editor, pembukaan berulang, kredensial tersimpan, dan pemulihan cache.

## Komit

- https://github.com/Cognis-Labs-HQ/Cognis/commit/e01bd17a1da792c21b0e71e331678721bb7b7c00
