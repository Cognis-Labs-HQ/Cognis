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

Kueri `langs` adalah daftar bahasa berurutan dipisahkan koma untuk judul indeks dan isi. Lokal regional mencoba bahasa dasar sebelum preferensi berikutnya; Inggris tetap tersedia sebagai cadangan wajib. Resolusi sama berlaku bagi Info, Penggunaan, dan Teknis pada versi komponen yang diminta.

Direktori topik inti memakai nama direktori relatif sebagai slug; topik akar memakai `index`. Slug komponen mengidentifikasi pemilik manifes. Ketiga tampilan meresolusikan keluarga berkas lokal melalui [kontrak dokumentasi](/docs/standard/technical).

## Konfigurasi

### Pembaca Dokumentasi

`COGNIS_DOCS_ARCHIVE_DIR` memilih direktori arsip. Jika tidak diatur, arsip berada di samping `COGNIS_CLI_TOKEN_PATH` atau dalam direktori pengguna pada `.cognis/docs-archive`. Proses memerlukan akses tulis di lokasi tersebut.

## Perilaku

### Perbedaan Dokumen

`docs:versionStore.createStore({ namespace, database, documents })` membuat penyimpanan bernamespace dengan operasi `ensureSchema`, `getLatest`, `getVersion`, `deleteAll`, `publish`, dan `diff`. `diff(fromHash, toHash)` memerlukan dua versi dengan slug yang sama.

Perbedaan dokumen memungkinkan modul menjelaskan perubahan antara dua versi dokumen yang tidak dapat diubah sebelum pengguna mengambil tindakan terhadap salinan terbaru.

### Spesifikasi Teknis

Kedua hash harus tersedia dalam namespace penyimpanan dan berasal dari slug dokumen yang sama. Hasilnya memuat hash sumber dan tujuan, slug bersama, serta baris terurut yang diklasifikasikan sebagai `unchanged`, `added`, `removed`, atau `changed`. Entri yang berubah memuat teks lama dan teks pengganti.

Renderer browser meng-escape teks dinamis serta menampilkan baris tambahan dengan warna hijau, perubahan dengan warna oranye, dan penghapusan dengan warna merah.

### Tampilan perbandingan Markdown

Gunakan `renderMarkdownDocumentDifference(diff)` dari kapabilitas browser `ui:documentDiff` untuk merender dokumen tujuan lengkap melalui perender Markdown host. Konten yang tidak berubah mempertahankan tampilan dokumen normal, sedangkan penambahan, penggantian, dan penghapusan memperoleh overlay hijau, oranye, dan merah dengan navigasi bilah ikhtisar. Perender memproses perbandingan gabungan dalam satu tahap Markdown sehingga blok kode berpagar, daftar, kutipan, dan struktur lain yang melintasi baris yang berubah tetap dipertahankan.

### Pembaca Dokumentasi

Ketiga tampilan beserta terjemahan yang tersedia disimpan secara atomik dalam satu `bundle.json` di bawah versi komponen. Hanya paket lengkap yang ditampilkan. Membaca ulang versi terpasang memperbarui seluruh paket; versi lengkap lain yang telah diterbitkan tetap tersedia.

## Keamanan

Titik akhir dokumentasi menyediakan informasi baca-saja. Jangan masukkan kredensial dan data akun pribadi ke sumber ini. Rute kemampuan perbandingan dokumen terpisah menegakkan autentikasi dan izin dokumennya sendiri.

## Referensi

- [src/api/package.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/api/package.json)
