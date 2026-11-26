# Build UI Produksi

**Cabang Fitur:** feature-add-production-ui-build-stage

## Aset produksi berciri hash

Image produksi kini menyajikan bundel JavaScript dan CSS yang diminifikasi serta diberi hash konten melalui manifes yang dihasilkan, sementara pengembangan tetap menyajikan modul sumber.

## Pengiriman terkompresi

Aset teks dihasilkan dalam varian Brotli dan gzip, lalu dinegosiasikan oleh rute UI netral dengan cache tetap dan metadata MIME yang tepat.

## Runtime server terkompilasi

Build Docker mengompilasi TypeScript dan menjalankan JavaScript secara langsung tanpa pemuat pengembangan `tsx`.

## Startup komponen terkompilasi

Pemuat gateway dan adapter produksi kini memetakan setiap titik masuk sumber TypeScript ke keluaran JavaScript terkompilasi, serta memberikan API alur platform kepada adapter Study saat startup.

## Alur browser deterministik

Kontrak alur browser bawaan kini diinisialisasi bersama konteks UI bersama sebelum hook gateway dalam bundel dapat memperluasnya.

## Proses mulai produksi menggunakan aset terkompilasi

Perintah mulai produksi kini mengatur manifes UI yang dihasilkan serta lokasi gateway, adapter, dan modul terkompilasi sebelum menjalankan server terkompilasi.

## Pengodean konten mengikuti preferensi kualitas klien

Negosiasi aset statis kini mengecualikan pengodean yang ditolak dengan nilai kualitas nol dan memilih representasi Brotli atau gzip yang tersedia dengan kualitas penerimaan tertinggi.

## Registrasi komponen kini divalidasi

Build produksi kini memverifikasi setiap titik masuk adapter terkompilasi. Manifes basis data dan file lokal mengarah ke modul masuk yang sebenarnya, gateway file menyelesaikan adapter dari lokasi terkompilasi yang dikonfigurasi, dan adapter Pesan memuat kontribusi kunci ruang dari modul penyimpanan yang benar.

## Komit

- [d9af537](https://github.com/Cognis-Labs-HQ/Cognis/commit/d9af537d6fa92347026e779da4387d886f0e8238)
