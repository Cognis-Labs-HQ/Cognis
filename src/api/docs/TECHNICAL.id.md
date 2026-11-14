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

Dokumentasi membaca manifes publik di direktori sumber yang sesuai. UUID manifes harus cocok dengan grup dan jalur kanonis harus tetap berada dalam pemilik tersebut. Hanya id, name, ui.stringsBaseUrl, serta ui.stringsRevision berupa ringkasan versi yang valid dan entri SHA-256 berkas bahasa publik yang diurutkan yang disertakan. Konfigurasi, kredensial, status siklus hidup, dan data katalog administrasi tidak termasuk. Tidak diperlukan autentikasi tambahan atau titik akhir administrasi.

Ekspor bersama localizeModulePresentation di /static/reuse/presentation.js digunakan oleh Modul dan Dokumentasi. Kunci nama manifes dan URL katalog yang ada digunakan tanpa menebak kunci. Nilai bahasa pilihan yang kosong atau tidak tersedia menggunakan bahasa Inggris. Jika nilai bahasa Inggris juga kosong atau tidak ada, perenderan gagal dengan missing_translation, bukan menampilkan kunci atau label pengganti.

Dokumen yang hanya tersimpan dalam arsip mendapat metadata tampilan terkini selama manifes pemilik tersedia. Jika metadata tidak tersedia, label pengenal sebelumnya tetap digunakan; dokumen, versi, dan pengelompokan tetap dapat diakses. Penghapusan modul tidak membuat atau mempertahankan nama terjemahan lama.

Panduan Dokumentasi tetap menyorot navigasi, dokumen aktif, dan tautan versi. Langkah navigasi menjelaskan grup berdasarkan nama tampilan. Status perluasan tetap disimpan dengan ID grup yang stabil selama navigasi; pemasangan yang dibatalkan saat memuat terjemahan tidak menerbitkan menu.

URL katalog bahasa harus berupa jalur kanonis di bawah /static/modules/{id}/ dengan segmen publik yang tidak kosong, tanpa penelusuran direktori, kueri, fragmen, atau asal eksternal. URL bukan teks dan deskriptor yang tidak valid ditolak sebelum penerjemahan. Manifes terpasang tanpa URL menggunakan rute /static/modules/{id}/languages yang dipetakan host ke direktori UI milik UUID, bahkan sebelum inisialisasi modul.

JSON, bentuk data, atau deskriptor bahasa manifes opsional yang tidak dapat dipakai diabaikan dengan diagnostik terstruktur berisi grup dan alasan yang aman. Dokumen valid lainnya tetap tersedia dengan identitas aslinya. Kegagalan sistem berkas yang tidak terduga tetap diteruskan. Penanganan metadata ini tidak pernah menyembunyikan kunci terjemahan yang dinyatakan tetapi hilang.

Revisi versi berlaku untuk katalog eksplisit maupun konvensional sehingga pembaruan modul menyegarkan label terjemahan saat halaman dipasang kembali. Halaman dan pencarian global memakai bahasa tampilan aktif, meskipun berbeda dari prioritas tersimpan; pencarian latar belakang tidak menulis ulang preferensi tersebut.

Revisi konten juga berubah saat hash berkas bahasa publik berubah pada versi perangkat lunak yang sama. Label diperbarui setelah pembaruan di luar tab aktif tanpa mengungkap status pemasangan. Perubahan isi bahasa yang tidak dinyatakan memerlukan pembatalan cache siklus hidup modul seperti biasa.

Pengenal versi prarilis yang dipublikasikan tetap valid untuk revisi tampilan, termasuk dokumen yang hanya tersimpan dalam arsip. Aset publik lain, termasuk nama berkas dengan spasi atau karakter non-Latin, tidak memengaruhi validasi atau ringkasan bahasa.

### Otorisasi Target Akun

Pengelolaan lintas akun serta semua pembacaan TFA dengan pilihan target, operasi kode pemulihan, preferensi metode, pengaktifan/penonaktifan, dan pengaturan ulang administrator memerlukan kebijakan Auth `auth:authorizeAccountTarget` v1. Administrator tidak dapat mengelola administrator lain, pemilik, atau administrator pendiri. Operasi yang diizinkan bagi pemilik tetap tersedia. Kebijakan yang hilang atau metadata akun yang tidak dapat dibaca menyebabkan penolakan sebelum akses penyimpanan lanjutan. Pengelolaan pengguna tetap melarang pengelolaan diri; TFA menerima target pribadi yang tidak ditentukan atau ditentukan secara persis. Penyiapan dan detail metode tetap khusus akun sendiri. Parameter target kosong, ganda, atau tidak valid ditolak. Gunakan Pengaturan untuk keamanan akun sendiri dan administrasi Pengguna untuk akun lain yang memenuhi syarat.

## Keamanan

Titik akhir dokumentasi menyediakan informasi baca-saja. Jangan masukkan kredensial dan data akun pribadi ke sumber ini. Rute kemampuan perbandingan dokumen terpisah menegakkan autentikasi dan izin dokumennya sendiri.

## Referensi

- [src/api/package.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/api/package.json)
