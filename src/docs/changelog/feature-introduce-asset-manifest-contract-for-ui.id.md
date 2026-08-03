# Revisi Aset Produksi

## Aset berversi yang tetap

Aset UI kini membawa revisi penerapan dan memakai cache tetap jangka panjang, sedangkan dokumen yang dapat berubah tetap divalidasi ulang.

## Validasi efisien

Aset tanpa versi mendukung validator sehingga salinan klien terkini menerima status 304 tanpa membaca isi berkas.

## Revisi aset khusus penerapan

Build kontainer produksi kini menyematkan revisi commit Git pada URL aset sehingga cache peramban dan CDN yang tidak berubah tidak mempertahankan rilis aplikasi lama.

## Pengiriman aman dan siap luring

Direktori statis ditolak sebelum header respons dikirim, dan dependensi aplikasi tanpa versi tetap tersedia melalui service worker ketika jaringan tidak tersedia.
