# Ikon Merek Lebih Kecil

**Cabang Fitur:** perf-small-brand-icons

## Resolusi per Tampilan

Favicon halaman, widget dasbor, tampilan autentikasi dan kesalahan, serta ikon pintasan memakai gambar 384px. Header halaman memakai gambar khusus setinggi 512px yang diskalakan langsung dari gambar asli dengan batas rapat. Rasio aspek dan alfa tetap terjaga tanpa ruang tepi ikon instalasi; ukuran kotak CSS header tetap sama. Varian normal dan maskable 384px diperkecil secara deterministik dari gambar 512px yang sesuai menggunakan Lanczos, dengan komposisi, rasio aspek, dan alfa tetap terjaga. Gambar asli dan ikon instalasi khusus platform (192px/512px serta Apple Touch 180px) tetap tersedia.

## Transfer Gambar Saat Mulai

Instalasi service worker menyiapkan ikon normal 192px, 384px, dan 512px tanpa mengambil gambar sumber berukuran besar. Versi cache diperbarui agar daftar aset klien ikut diperbarui. Uji rute dan instalasi memeriksa dimensi gambar serta batas transfer yang ditingkatkan untuk kualitas, menggunakan kontrak autentikasi yang diinjeksi tanpa membuat token tersimpan. Worker juga menyiapkan gambar khusus header.

## Komit

- [eaa76ae](https://github.com/Cognis-Labs-HQ/Cognis/commit/eaa76ae32f517fd4b2a52fd1c064aa19720dc9ac)
- [b1fd6cd](https://github.com/Cognis-Labs-HQ/Cognis/commit/b1fd6cd8f41b6b03855eef1f87a21e98989e46b8)
- [0d6fbe8](https://github.com/Cognis-Labs-HQ/Cognis/commit/0d6fbe8efa1621057a43e721b949beca339cdf82)
