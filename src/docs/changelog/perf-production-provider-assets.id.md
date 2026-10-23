# Pemuatan Penyedia Lebih Cepat

**Cabang Fitur:** perf-production-provider-assets

## Resolusi Bundel Produksi

Hanya URL skrip yang dideklarasikan dan pendaftaran bilah navigasi langsung yang menjadi titik masuk wajib; impor statis biasa tetap menjadi dependensi dalam bundel. Build menyertakan referensi skrip host literal meskipun titik masuk lain mengimpornya. Direktori statis gateway dan adapter yang terdaftar memetakan prefiks URL khusus ke bundel hasil build. Versi API menjadi 0.6.22.

## Tumpang Tindih Unduhan Host

Hanya katalog yang diperlukan sebelum pemasangan halaman yang mengaktifkan pramuat. Katalog bilah navigasi tetap mengunduh sesuai kebutuhan agar penemuan latar belakang tidak memicu banyak permintaan bersamaan saat navigasi. Setelah penemuan terautentikasi, bundel host yang tidak berubah dipramuat bersamaan sambil mempertahankan urutan impor dan pemasangan penyedia. Tautan dibersihkan setelah selesai atau gagal; penyedia aktif tidak dimuat ulang. URL modul eksternal, sumber, dan URL dengan revisi mempertahankan perilaku pemuatannya.

## Pertahankan Batas Runtime

Uji regresi mencakup identitas modul, otorisasi, penyaringan aktivasi dan penghapusan, jalur sumber eksternal, urutan pemasangan, pembersihan, dan percobaan ulang. Respons pribadi dan data bahasa tidak diberi cache baru.

## Komit

- [9def8947fd3571bee5901acf901119e190d3f9d1](https://github.com/Cognis-Labs-HQ/Cognis/commit/9def8947fd3571bee5901acf901119e190d3f9d1)
