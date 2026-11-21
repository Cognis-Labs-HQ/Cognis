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

## Konfigurasi

### Pembaca Dokumentasi

`COGNIS_DOCS_ARCHIVE_DIR` memilih direktori arsip. Jika tidak diatur, arsip berada di samping `COGNIS_CLI_TOKEN_PATH` atau dalam direktori pengguna pada `.cognis/docs-archive`. Proses memerlukan akses tulis di lokasi tersebut.

## Perilaku

### Perbedaan Dokumen

Perbedaan dokumen memungkinkan modul menjelaskan perubahan antara dua versi dokumen yang tidak dapat diubah sebelum pengguna mengambil tindakan terhadap salinan terbaru.

### Spesifikasi Teknis

Kedua hash harus tersedia dalam namespace penyimpanan dan berasal dari slug dokumen yang sama. Hasilnya memuat hash sumber dan tujuan, slug bersama, serta baris terurut yang diklasifikasikan sebagai `unchanged`, `added`, `removed`, atau `changed`. Entri yang berubah memuat teks lama dan teks pengganti.

Renderer browser meng-escape teks dinamis serta menampilkan baris tambahan dengan warna hijau, perubahan dengan warna oranye, dan penghapusan dengan warna merah.

### Tampilan perbandingan Markdown

Gunakan `renderMarkdownDocumentDiff(diff)` dari kapabilitas browser `ui:documentDiff` untuk merender dokumen tujuan lengkap melalui perender Markdown host. Konten yang tidak berubah mempertahankan tampilan dokumen normal, sedangkan penambahan, penggantian, dan penghapusan memperoleh overlay hijau, oranye, dan merah dengan navigasi bilah ikhtisar. Perender memproses perbandingan gabungan dalam satu tahap Markdown sehingga blok kode berpagar, daftar, kutipan, dan struktur lain yang melintasi baris yang berubah tetap dipertahankan.

### Pembaca Dokumentasi

Ketiga tampilan beserta terjemahan yang tersedia disimpan secara atomik dalam satu `bundle.json` di bawah versi komponen. Hanya paket lengkap yang ditampilkan. Membaca ulang versi terpasang memperbarui seluruh paket; versi lengkap lain yang telah diterbitkan tetap tersedia.

Masukan basis data menggunakan kontrak publik terstruktur `ensureTable` dan `executeCommand` milik gateway DB. Pembuatan penyimpanan dan metode penyimpanan yang tidak dapat diubah memiliki kontrak TypeScript eksplisit tanpa memerlukan driver basis data tertentu.

Perilaku bersama: [TFA](/docs/gateways/tfa/technical).

Penulisan pengaturan yang tidak terkait tidak menerapkan kebijakan TFA. Jika kapabilitas pembacaan TFA tersedia, pembacaan sistem dan penulisan tanpa kolom TFA memakai kebijakan terkini dari pemiliknya; kegagalan pembacaan menghasilkan kesalahan, bukan laporan bahwa penegakan dinonaktifkan. Tanpa kapabilitas opsional tersebut, preferensi tersimpan hanya merupakan salinan yang mungkin usang. Perubahan kebijakan eksplisit tetap memerlukan kapabilitas pemilik.

Pemeriksaan akun hanya menerima kredensial sesi. Rute sumber daya campuran mengambil `share:getGuestClaims(request)` secara eksplisit, lalu memeriksa izin sumber daya dan tindakan. Penerimaan tamu yang tidak ada atau tidak valid hanya dapat dilanjutkan dengan autentikasi akun biasa, bukan otorisasi akun memakai klaim tamu. Rute modul yang memeriksa seluruh akses di penangannya menghilangkan metadata peran akun luar; rute administrasi mempertahankannya. Hanya penemuan penyedia dan rute aplikasi yang menerima kredensial tamu aktif untuk perenderan, dengan filter visibilitas peran yang sudah ada. Endpoint identitas tanpa cache hanya mengembalikan subjek, peran, penyedia, tujuan, dan status penyiapan yang terverifikasi.

`Promise<{ sub: string; role: "user"; providerId: string; purpose: "share"; setupPending: false } | null>`

## Keamanan

Titik akhir dokumentasi menyediakan informasi baca-saja. Jangan masukkan kredensial dan data akun pribadi ke sumber ini. Rute kemampuan perbandingan dokumen terpisah menegakkan autentikasi dan izin dokumennya sendiri.

## Referensi

- [src/api/package.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/api/package.json)
