# Kinerja produksi dan observabilitas

## Web produksi aman dan sadar cache

Web TLS HTTP/2 menyediakan penggunaan ulang koneksi, kompresi Brotli/gzip, cache aset hash immutable, validasi ulang HTML, header proxy tepercaya, dan respons API privat. `cognis-web` dapat berjalan hanya dengan HTTP melalui `COGNIS_WEB_TLS_MODE=deferred` ketika TLS diterminasi di hulu. Penyiapan menulis mode dan path sertifikat yang dapat dikonfigurasi ke file env web terisolasi; karena itu `cognis-web` tidak dapat membaca kunci enkripsi Cognis atau kredensial basis data. Compose menunggu healthcheck basis data dan Cognis.

## Telemetri kinerja netral-vendor

Pengukuran server, basis data, cache, event loop, Web Vitals, transfer, dan pemasangan SPA berbasis ctx memakai label terbatas dan sampling. Timing DB kini mempertahankan permukaan executor mentah yang dipakai saat inisialisasi skema, dan kegagalan bootstrap gateway wajib kini langsung melaporkan akar penyebabnya alih-alih kemudian muncul sebagai dependensi yang hilang.

## Anggaran kinerja terukur

Baseline hosted untuk pemuatan dingin, hangat, dan navigasi SPA beserta anggaran yang harus dinilai sebelum Redis kini terdokumentasi.
