# Keluaran pencatatan yang dapat dikonfigurasi

## Tingkat log konsol dan berkas yang independen

Administrator kini dapat memilih ambang tingkat keparahan terpisah untuk pencatatan konsol dan berkas dari tingkat yang didukung gateway pencatatan.

## Penggantian saat berjalan dengan reset ke lingkungan

Pengaturan adapter pencatatan dapat menggantikan nilai lingkungan Docker saat berjalan, termasuk format konsol dan rotasi, lalu direset ke konfigurasi lingkungan. Jalur berkas log tetap dimiliki oleh lingkungan.

## Pengaturan untuk adapter yang selalu aktif

Baris Console Logging dan File Logging kini membuka popup pengaturannya meskipun adapter wajib ini tidak dapat dinonaktifkan.

## Keluaran langsung yang tersinkronisasi

Tingkat keparahan dan format yang dikonfigurasi kini menggantikan logger bootstrap awal untuk semua gateway yang dimuat setelahnya, sehingga keluaran Docker langsung mengikuti perubahan konsol. Peringatan penggantian nilai lingkungan kini tampil berwarna oranye di samping judul bidangnya.

## Label konfigurasi yang lebih jelas

Peringatan penggantian kini berbunyi “Mengganti variabel lingkungan”, dan opsi kompresi adapter berkas diberi nama “Log Compression”.

## Konfigurasi tervalidasi milik adapter

Adapter konsol dan berkas kini memiliki validasi konfigurasi serta pemetaan logger. Penggantian berkas menolak ukuran rotasi dan jumlah retensi yang tidak aman sebelum diterapkan.

## Pengaturan pencatatan yang diterjemahkan

Label bidang kini menggunakan sumber daya bahasa Jerman, Inggris, Indonesia, dan Jepang milik adapter, yang dimuat Administrasi sebelum merender formulir konfigurasi.
