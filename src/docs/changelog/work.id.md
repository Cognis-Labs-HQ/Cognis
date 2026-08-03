# Cache Aset Aplikasi Andal

## Revisi aset khusus penerapan

Build kontainer produksi kini menyematkan revisi commit Git pada URL aset sehingga cache peramban dan CDN yang tidak berubah tidak mempertahankan rilis aplikasi lama.

## Pengiriman aman dan siap luring

Direktori statis ditolak sebelum header respons dikirim, dan dependensi aplikasi tanpa versi tetap tersedia melalui service worker ketika jaringan tidak tersedia.
