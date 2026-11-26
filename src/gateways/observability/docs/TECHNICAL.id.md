# Referensi Teknis

Antarmuka publik dan aturan operasional Pemantauan Kinerja.

## Antarmuka

observability:metrics.record(name, value, labels) merekam nilai terbatas berizin. POST /api/v1/observability/client menerima metrics dan navigation, paling banyak enam belas metrik serta teks terakumulasi 16.384 karakter.

## Konfigurasi

Tujuan bawaan menulis log debug. Nama dan kunci label memakai daftar izin; tujuan pengganti menerapkan observability:metrics.record tanpa rute vendor khusus.

## Perilaku

### Gateway observabilitas

Gateway menyediakan kapabilitas ctx netral-vendor `observability:metrics` dan endpoint telemetri peramban tersampel yang dibatasi ukurannya. Nama metrik dan label dibatasi dengan daftar izin agar kardinalitas tetap terkendali. Tujuan metrik dapat diganti tanpa mengikat route atau gateway ke vendor telemetri.

### Spesifikasi teknis

Nama metrik dan label menggunakan daftar izin, payload browser diambil sampelnya dan dibatasi ukurannya, serta sink tetap netral vendor dan dapat diganti melalui kontrak kapabilitas.

## Keamanan

POST /api/v1/observability/client memerlukan sesi pengguna. Nama dan kunci label dibatasi daftar izin, nilai dipotong delapan puluh karakter, dan akun dibatasi enam permintaan per menit.

## Referensi

- [src/gateways/observability/manifest.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/gateways/observability/manifest.json)
- [src/gateways/observability/bootstrap.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/gateways/observability/bootstrap.ts)
