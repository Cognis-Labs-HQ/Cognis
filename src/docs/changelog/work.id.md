# Kinerja produksi dan observabilitas

## Edge produksi aman dan sadar cache

Edge TLS HTTP/2 kini menyediakan penggunaan ulang koneksi, kompresi Brotli/gzip, aset hash yang immutable, validasi ulang HTML, header proxy tepercaya, dan respons API privat. Edge dinamai `cognis-web` di Compose dan diterbitkan oleh GitLab CI.

## Telemetri kinerja netral-vendor

Pengukuran server, basis data, cache, event loop, Web Vitals, transfer, dan pemasangan SPA berbasis ctx memakai label terbatas dan sampling.

## Anggaran kinerja terukur

Baseline hosted untuk pemuatan dingin, hangat, dan navigasi SPA beserta anggaran yang harus dinilai sebelum Redis kini terdokumentasi.
