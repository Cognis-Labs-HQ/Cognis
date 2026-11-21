# Referensi Teknis

Antarmuka publik dan aturan operasional Pemantauan Kinerja.

## Antarmuka

Pemantauan Kinerja terintegrasi melalui gerbang pemilik; manifesnya mengidentifikasi komponen dan dependensi yang diperlukan.

## Konfigurasi

Konfigurasi disediakan melalui gerbang pemilik. Pemantauan Kinerja tidak menyatakan konfigurasi tambahan dalam manifesnya.

## Perilaku

### Gateway observabilitas

Gateway menyediakan kapabilitas ctx netral-vendor `observability:metrics` dan endpoint telemetri peramban tersampel yang dibatasi ukurannya. Nama metrik dan label dibatasi dengan daftar izin agar kardinalitas tetap terkendali. Tujuan metrik dapat diganti tanpa mengikat route atau gateway ke vendor telemetri.

### Contoh penggunaan

Selesaikan `observability:metrics` melalui `ctx.capabilities` untuk metrik server, atau kirim telemetri browser yang diizinkan melalui endpoint gateway.

### Spesifikasi teknis

Nama metrik dan label menggunakan daftar izin, payload browser diambil sampelnya dan dibatasi ukurannya, serta sink tetap netral vendor dan dapat diganti melalui kontrak kapabilitas.

## Keamanan

Akses Pemantauan Kinerja diatur oleh pemanggil dan gerbang pemilik. Mengaktifkan komponen tidak menambah izin akun.

## Referensi

Kode sumber dan metadata paket: `src/gateways/observability/`.
