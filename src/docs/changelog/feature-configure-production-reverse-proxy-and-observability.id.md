# Kinerja produksi dan observabilitas

## Edge produksi aman dan sadar cache

Edge TLS HTTP/2 kini menyediakan penggunaan ulang koneksi, kompresi Brotli/gzip, aset hash yang immutable, validasi ulang HTML, header proxy tepercaya, dan respons API privat. Layanan edge dan image dinamai `cognis-web` di setiap file Compose, diterbitkan oleh GitLab CI, memasang Brotli melalui paket modul Nginx native Alpine, dan dapat berjalan hanya HTTP dengan `COGNIS_EDGE_TLS_MODE=deferred` saat TLS diterminasi di hulu.

## Telemetri kinerja netral-vendor

Pengukuran server, basis data, cache, event loop, Web Vitals, transfer, dan pemasangan SPA berbasis ctx memakai label terbatas dan sampling.

## Anggaran kinerja terukur

Baseline hosted untuk pemuatan dingin, hangat, dan navigasi SPA beserta anggaran yang harus dinilai sebelum Redis kini terdokumentasi.
