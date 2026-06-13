# Adaptor Teks / Markdown

## Ikhtisar

Adaptor Teks adalah adaptor pembaca file untuk file teks biasa dan Markdown. Di dalam ruang kelas, adaptor ini juga berfungsi sebagai Buku Catatan — editor teks kaya yang digunakan guru dan siswa untuk menulis, memformat, dan menyimpan catatan langsung ke materi kelas. Adaptor yang sama menangani tampilan file hanya-baca maupun pengeditan catatan interaktif.

## Tanggung Jawab

- Mendaftarkan dukungan untuk tipe MIME `text/plain` dan `text/markdown` ke gateway pembaca file.
- Mengekspos rute baca/tulis buku catatan kelas untuk pengguna terautentikasi.
- Menyumbangkan kemampuan `file-reader:text:ui` dengan skrip penampil, lembar gaya, dan URL dasar bundle string.
- Menormalkan dan membatasi variabel lingkungan `TEXT_FILE_READER_MAX_BYTES` dalam batas yang aman.

Tidak bertanggung jawab atas: penyimpanan byte file (itu tanggung jawab gateway penyimpanan file), penerapan batas ukuran unggahan, atau merender format selain teks dan Markdown.

## Arsitektur

`src/adapters/file-reader/text/index.ts` menangani bootstrap: menyelesaikan konteks rute opsional dari `auth:routeContext`, menerapkan penggantian `TEXT_FILE_READER_MAX_BYTES`, dan mendaftarkan rute API buku catatan.

## Konfigurasi

| Variabel                     | Nilai Bawaan      | Keterangan                                                      |
| ---------------------------- | ----------------- | --------------------------------------------------------------- |
| `TEXT_FILE_READER_MAX_BYTES` | `262144` (256 KB) | Ukuran byte maksimum file teks. Dibatasi ke `[16384, 4194304]`. |

## Rute API

| Metode | Path                                | Keterangan                                 | Autentikasi |
| ------ | ----------------------------------- | ------------------------------------------ | ----------- |
| `GET`  | `/api/v1/study/classes/:id/notepad` | Ambil konten buku catatan kelas saat ini   | Diperlukan  |
| `PUT`  | `/api/v1/study/classes/:id/notepad` | Simpan konten buku catatan ke materi kelas | Diperlukan  |
