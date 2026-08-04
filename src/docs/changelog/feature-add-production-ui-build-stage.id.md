# Build UI Produksi

## Aset produksi berciri hash

Image produksi kini menyajikan bundel JavaScript dan CSS yang diminifikasi serta diberi hash konten melalui manifes yang dihasilkan, sementara pengembangan tetap menyajikan modul sumber.

## Pengiriman terkompresi

Aset teks dihasilkan dalam varian Brotli dan gzip, lalu dinegosiasikan oleh rute UI netral dengan cache tetap dan metadata MIME yang tepat.

## Runtime server terkompilasi

Build Docker mengompilasi TypeScript dan menjalankan JavaScript secara langsung tanpa pemuat pengembangan `tsx`.
