# Referensi Teknis

Antarmuka publik dan aturan operasional Server Aplikasi.

## Antarmuka

### Pembaca Dokumentasi

| Metode | Jalur                                   | Hasil                                        |
| ------ | --------------------------------------- | -------------------------------------------- |
| GET    | `/api/v1/docs`                          | Mencantumkan paket dokumentasi dan versinya. |
| GET    | `/api/v1/docs/:version/:slug`           | Membaca Info dari versi pilihan.             |
| GET    | `/api/v1/docs/:version/:slug/usage`     | Membaca Penggunaan dari versi yang sama.     |
| GET    | `/api/v1/docs/:version/:slug/technical` | Membaca Teknis dari versi yang sama.         |

`langs` menyatakan urutan bahasa; bahasa Inggris menjadi cadangan terakhir. Indeks menyediakan `slug`, `title`, `group`, `version`, `versions`, `sourceName`, dan `views`.

## Konfigurasi

### Pembaca Dokumentasi

`COGNIS_DOCS_ARCHIVE_DIR` memilih direktori arsip. Jika tidak diatur, arsip berada di samping `COGNIS_CLI_TOKEN_PATH` atau dalam direktori pengguna pada `.cognis/docs-archive`. Proses memerlukan akses tulis di lokasi tersebut.

## Perilaku

### Perbedaan Dokumen

Perbedaan dokumen memungkinkan modul menjelaskan perubahan antara dua versi dokumen yang tidak dapat diubah sebelum pengguna mengambil tindakan terhadap salinan terbaru.

### Contoh Penggunaan

Panggil `store.diff(fromVersion, toVersion)` melalui penyimpanan yang dibuat oleh kapabilitas `docs:versionStore`. Modul runtime dapat mengembalikan hasil terstruktur melalui rute terautentikasinya sendiri, memperoleh `ui:documentDiff` melalui ctx browser, dan meneruskan hasil tersebut ke `renderDocumentDiff(diff)`.

### Spesifikasi Teknis

Kedua hash harus tersedia dalam namespace penyimpanan dan berasal dari slug dokumen yang sama. Hasilnya memuat hash sumber dan tujuan, slug bersama, serta baris terurut yang diklasifikasikan sebagai `unchanged`, `added`, `removed`, atau `changed`. Entri yang berubah memuat teks lama dan teks pengganti.

Renderer browser meng-escape teks dinamis serta menampilkan baris tambahan dengan warna hijau, perubahan dengan warna oranye, dan penghapusan dengan warna merah.

### Tampilan perbandingan Markdown

Gunakan `renderMarkdownDocumentDiff(diff)` dari kapabilitas browser `ui:documentDiff` untuk merender dokumen tujuan lengkap melalui perender Markdown host. Konten yang tidak berubah mempertahankan tampilan dokumen normal, sedangkan penambahan, penggantian, dan penghapusan memperoleh overlay hijau, oranye, dan merah dengan navigasi bilah ikhtisar. Perender memproses perbandingan gabungan dalam satu tahap Markdown sehingga blok kode berpagar, daftar, kutipan, dan struktur lain yang melintasi baris yang berubah tetap dipertahankan.

### Pembaca Dokumentasi

Ketiga tampilan beserta terjemahan yang tersedia disimpan secara atomik dalam satu `bundle.json` di bawah versi komponen. Hanya paket lengkap yang ditampilkan. Membaca ulang versi terpasang memperbarui seluruh paket; versi lengkap lain yang telah diterbitkan tetap tersedia.

## Keamanan

Titik akhir dokumentasi menyediakan informasi baca-saja. Jangan masukkan kredensial dan data akun pribadi ke sumber ini. Rute kemampuan perbandingan dokumen terpisah menegakkan autentikasi dan izin dokumennya sendiri.

## Referensi

Kode sumber dan metadata paket: `src/api/`.
