# Ikon Merek Lebih Kecil

**Cabang Fitur:** perf-small-brand-icons

## Gunakan Kembali Ikon Instalasi

Favicon halaman, merek pada kerangka halaman, widget dasbor, serta tampilan autentikasi dan kesalahan kini memakai ikon instalasi persegi yang sudah tersedia. Gambar asli tetap tersedia di URL yang sama. Tidak ada konversi gambar atau dependensi aset baru.

## Batasi Transfer Gambar Awal

Instalasi service worker menyimpan ikon instalasi kecil dan besar yang tersedia tanpa mengambil gambar sumber yang terlalu besar. Versi cache dinaikkan agar klien memperbarui daftar aset kerangka halaman. Penanganan API pribadi dan revisi modul tidak berubah. Uji rute dan instalasi worker menjaga batas transfer gambar.

## Komit
