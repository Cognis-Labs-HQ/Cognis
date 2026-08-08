# Keluaran pencatatan yang dapat dikonfigurasi

## Tingkat log konsol dan berkas yang independen

Administrator kini dapat memilih ambang tingkat keparahan terpisah untuk pencatatan konsol dan berkas dari tingkat yang didukung gateway pencatatan.

## Penggantian saat berjalan dengan reset ke lingkungan

Pengaturan adapter pencatatan dapat menggantikan nilai lingkungan Docker saat berjalan, termasuk format konsol, jalur berkas, dan rotasi, lalu direset ke konfigurasi lingkungan.

## Pengaturan untuk adapter yang selalu aktif

Baris Console Logging dan File Logging kini membuka popup pengaturannya meskipun adapter wajib ini tidak dapat dinonaktifkan.

## Keluaran langsung yang tersinkronisasi

Tingkat keparahan dan format yang dikonfigurasi kini menggantikan logger bootstrap awal untuk semua gateway yang dimuat setelahnya, sehingga keluaran Docker langsung mengikuti perubahan konsol. Peringatan penggantian nilai lingkungan kini tampil berwarna oranye di samping judul bidangnya.
