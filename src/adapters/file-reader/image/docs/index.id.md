# Adaptor Penampil Gambar

## Ikhtisar

Adaptor Penampil Gambar adalah adaptor pembaca file untuk format gambar raster dan vektor umum. Adaptor ini merender gambar secara langsung di dalam materi kelas dan penampil lampiran file tanpa memerlukan pemuatan halaman terpisah. Penampil mendukung pemuatan progresif untuk gambar berukuran besar.

## Tanggung Jawab

- Mendaftarkan dukungan untuk tipe MIME JPEG, PNG, GIF, WebP, SVG, dan AVIF ke gateway pembaca file.
- Menyumbangkan kemampuan `file-reader:image:ui` agar sisi browser dapat memuat skrip dan lembar gaya penampil yang tepat.
- Mendaftarkan direktori aset statis adaptor agar skrip penampil dan CSS tersedia di `/static/adapters/file-reader/image/`.

Tidak bertanggung jawab atas: pengambilan byte file (itu tanggung jawab gateway penyimpanan file), penerapan batas ukuran file, atau transformasi gambar.

## Arsitektur

`src/adapters/file-reader/image/index.ts` adalah satu-satunya file sisi server dan mengimplementasikan `FileReaderAdapter` serta `bootstrapFileReaderAdapter`.

## Tipe yang Didukung

| Ekstensi      | Tipe MIME       |
| ------------- | --------------- |
| `jpg`, `jpeg` | `image/jpeg`    |
| `png`         | `image/png`     |
| `gif`         | `image/gif`     |
| `webp`        | `image/webp`    |
| `svg`         | `image/svg+xml` |
| `avif`        | `image/avif`    |
