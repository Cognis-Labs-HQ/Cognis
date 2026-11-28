# Kontrak Dokumentasi

Bundel dokumentasi memisahkan informasi pengantar, prosedur yang dapat dijalankan, dan kontrak teknis dengan struktur serta keluarga sumber lokal yang tervalidasi.

## Antarmuka

Setiap komponen menyatakan `documentation.readme`, `documentation.usage`, dan `documentation.technical` dengan nilai `docs/README.en.md`, `docs/USAGE.en.md`, dan `docs/TECHNICAL.en.md`. Setiap bahasa mempertahankan akhiran `.en`, `.de`, `.id`, atau `.ja`. Jalur manifes menunjuk anggota Inggris dalam keluarga dokumen lokal, bukan berkas bahasa tampilan tetap. Topik inti ditemukan dari direktori berisi `INFO.<locale>.md`, `USAGE.<locale>.md`, dan `TECHNICAL.<locale>.md`.

Nama dasar dokumen peka huruf besar-kecil dan harus ditulis dengan huruf besar. Varian INFO, README, USAGE, dan TECHNICAL dengan huruf kecil atau campuran ditolak, meskipun berkas dengan nama yang benar juga tersedia.

### Susunan wajib

Gunakan tepat judul H2 berikut dalam urutan ini sesuai bahasa dokumen. Info memakai susunan README, termasuk berkas INFO inti. Jangan menerjemahkan pengenal atau memakai nama judul alternatif.

| Bahasa | Info / README                                                                            | Penggunaan                                                                  | Teknis                                                                       |
| ------ | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| en     | `What You Can Do` → `Before You Start` → `Get Started` → `Learn More`                    | `Prerequisites` → `Examples` → `Expected Results` → `Troubleshooting`       | `Interfaces` → `Configuration` → `Behavior` → `Security` → `Reference`       |
| de     | `Möglichkeiten` → `Vor dem Start` → `Erste Schritte` → `Weitere Informationen`           | `Voraussetzungen` → `Beispiele` → `Erwartete Ergebnisse` → `Fehlerbehebung` | `Schnittstellen` → `Konfiguration` → `Verhalten` → `Sicherheit` → `Referenz` |
| id     | `Yang Dapat Anda Lakukan` → `Sebelum Memulai` → `Langkah Awal` → `Pelajari Lebih Lanjut` | `Prasyarat` → `Contoh` → `Hasil yang Diharapkan` → `Pemecahan Masalah`      | `Antarmuka` → `Konfigurasi` → `Perilaku` → `Keamanan` → `Referensi`          |
| ja     | `できること` → `始める前に` → `はじめに` → `詳しい情報`                                  | `前提条件` → `使用例` → `期待される結果` → `問題の解決`                     | `インターフェース` → `設定` → `動作` → `セキュリティ` → `リファレンス`       |

Mulai dengan satu `# Judul` tanpa indentasi dengan panjang maksimal 30 karakter, lalu baris kosong dan paragraf pengantar yang informatif. Setelahnya, tulis bagian H2 wajib. Pisahkan setiap judul dari isi dengan baris kosong; jangan memakai judul berindentasi, HTML, atau Setext. Subbagian H3–H6 diperbolehkan di dalam bagian wajib tanpa melompati tingkat. Setiap bagian dan subbagian memerlukan isi yang terlihat; bagian induk boleh berisi subbagian yang terisi. Komentar tidak dihitung sebagai isi.

Info tidak memuat kode implementasi atau spesifikasi endpoint. Penggunaan dan Teknis boleh memakai pagar kode backtick atau tilde yang seimbang. Pagar penutup memakai karakter yang sama, setidaknya sepanjang pembuka, dan tanpa teks tambahan. Judul serta komentar di dalam contoh diperlakukan sebagai isi literal. Kode atau daftar tidak menggantikan paragraf pengantar.

Matriks lengkap berisi tiga berkas untuk masing-masing bahasa `en`, `de`, `id`, dan `ja`, yaitu 12 berkas per topik. Manifes komponen mendeklarasikan tepat jalur README, USAGE, dan TECHNICAL bahasa Inggris. Direktori inti memakai INFO, USAGE, dan TECHNICAL tanpa manifes komponen tersendiri per topik. Nama dasar wajib huruf besar dan sufiks bahasa huruf kecil. Manual Markdown tambahan di luar ruang changelog terpisah tidak diperbolehkan.

## Konfigurasi

Jalankan `npm run check:docs`. CI permintaan penggabungan juga membandingkan berkas catatan baru dengan cabang sumber melalui `--base` dan `--branch`. Hanya satu set catatan empat bahasa yang diizinkan.

## Perilaku

### Batas Logging

JavaScript dan TypeScript aplikasi, skrip peramban sebaris, serta penangan peristiwa harus menerbitkan diagnostik melalui kapabilitas log yang diinjeksi atau port diagnostik peramban publik. Akses konsol asli dibatasi pada adaptor keluaran logging dan inisialisasi gateway logging. Penangan lain dalam berkas inisialisasi tidak mendapat pengecualian. Laporan perintah dan build menggunakan aliran terminal secara eksplisit. Pemeriksaan konsol asli juga mencakup sumber perkakas; fixture pengujian tetap berada di luar pemindaian sumber produksi.

Jalankan `node --import tsx --test src/tooling/tests/logging/*.test.js` untuk memeriksa repositori dan kasus deteksi. Pemeriksaan mencakup modul eksternal yang terpasang, mendukung `COGNIS_EXTERNAL_MODULES_ROOT`, dan melaporkan berkas serta baris pelanggaran. Alias, akses terhitung, dan impor `node:console` ditolak tanpa pengecualian untuk pelanggaran lama.

Topik baru membuka Info. Info, Penggunaan, dan Teknis adalah tiga tampilan satu versi komponen. Server membaca semua sumber sebelum menerbitkan paket secara atomik; tampilan hilang atau terjemahan parsial menolak penerbitan. Pergantian tampilan mempertahankan versi, dan paket historis tetap terbaca setelah komponen dihapus.

Isi dokumen, judul navigasi, dan pencarian mendahulukan bahasa UI aktif, lalu bahasa cadangan terkonfigurasi dan Inggris. Pilihan berlaku konsisten untuk Info, Penggunaan, Teknis, serta versi arsip.

### Katalog Terjemahan

Setiap katalog `strings.xml` yang dikirim menggunakan akar `<resources>`. Entri bahasa Inggris tidak boleh kosong; bahasa lain mempertahankan kunci dan urutan yang sama. Pemanggilan terjemahan literal dan atribut terjemahan HTML harus merujuk ke entri bahasa Inggris. Jalankan `node --import tsx --test src/ui/tests/strings-coverage.test.js src/tooling/tests/translations/*.test.js` untuk memeriksa katalog dan referensi sumber. Kunci yang dihitung tetap memerlukan pengujian perilaku komponen.

### Nama Binding

Pemeriksaan pohon sintaks memindai JavaScript dan TypeScript di seluruh `src`, termasuk gateway, perkakas, pengujian, dan fixture. Pemeriksaan mencakup deklarasi, impor, fungsi dan kelas bernama, binding enum dan namespace waktu jalan, destrukturisasi, parameter waktu jalan dan tanda tangan tipe, properti parameter konstruktor, binding catch, serta anggota privat. Ekspor, deklarator tambahan, pergantian baris, dan anotasi tipe tidak dapat melewatinya. Singkatan yang dikenal ditolak dalam nama camelCase dan konstanta berdasarkan `src/tooling/reuse/ambiguous-name-words.json`. Pengganti bernomor seperti `event2` harus menjelaskan perannya. Alias tabel statis juga harus deskriptif. Kegagalan penguraian menggagalkan validasi.

Kosakata pengembang yang lazim diperbolehkan, termasuk `args`, `db`, LDAP `dn`, HTTP `req`/`res`, `env`, `opts`, dan `params`. Peta `conventional` dalam glosarium menentukan daftar lengkap beserta maknanya. Bentuk singkat diperbolehkan sebagai nama mandiri pada variabel lokal, parameter tanda tangan, dan anggota privat, seperti `db` dan `this.db`. Token satuan ukuran seperti `ms`, `sec`, `px`, `rad`, dan `deg` juga tetap disingkat dalam nama gabungan, misalnya `INVITE_EXPIRY_MS` dan `widthPx`; peta `measurementUnits` dalam glosarium mencatat pengecualian ini. Nama gabungan memperluas setiap singkatan lainnya, termasuk pada kode upstream: `databaseType`, `DatabaseExecutor`, `createDatabaseExecutor`, dan `baseDistinguishedName`. Aturan yang sama berlaku untuk nama tipe dan metode gabungan milik komponen. Impor pihak ketiga dan anggota platform yang kanonis mempertahankan nama eksternalnya. Singkatan yang tidak jelas dan pengganti bernomor tetap merupakan kesalahan. Pengecualian pendek lainnya adalah `_` yang tidak digunakan dan tidak diekspor, `id`, serta penghitung numerik `i`/`j`/`k` dengan pembaruan aritmetika yang sesuai. Koordinat dan ukuran menggunakan nama deskriptif. Pertahankan kunci muatan publik, tetapi ubah deklarasi API milik komponen, ekspor, impor, dan semua pemanggilnya bersama-sama ke satu nama kanonis. Alias impor/ekspor yang hanya mengganti nama menggagalkan validasi; jangan membuat alias perluasan untuk impor pihak ketiga. Parameter tipe generik mempertahankan peran tipenya. Jalankan `node --test src/ui/tests/ambiguous-names.test.js src/tooling/tests/naming/detector.test.js`; rangkaian pengujian lengkap mencakup pemeriksaan ini.

### Validasi dan batasan

`npm run check:docs` memeriksa manifes komponen dan direktori inti yang sebenarnya. Pengujian dokumentasi mengubah judul, urutan, isi, pagar kode, nama berkas, dan jalur manifes pada setiap peran dan bahasa. Pengujian juga membandingkan matriks bagian dalam setiap standar terlokalisasi dengan skema yang dibaca mesin. CI menjalankan pemeriksaan dokumentasi dan seluruh pengujian. Pemeriksaan ini menegakkan susunan dan integritas referensi konkret; penulis tetap harus memverifikasi kebenaran klaim pada implementasi pemiliknya.

## Keamanan

Dokumentasi bersifat publik: jangan sertakan kredensial, data akun pribadi, atau rahasia operasional. Penunjuk manifes tetap di ruang dokumentasi pemiliknya. Penemuan inti membaca paket entri direktori, bukan nama berkas Markdown sembarang.

## Referensi

README menjelaskan tujuan, tugas, akses, dan langkah awal tanpa spesifikasi titik akhir atau kode implementasi. USAGE berisi prosedur nyata atau contoh publik, prasyarat, hasil, dan pemecahan masalah. TECHNICAL membahas antarmuka, konfigurasi, perilaku, keamanan, dan referensi.

Nama H2 terlokalisasi dan urutannya ditentukan dalam `src/tooling/reuse/documentation/structure.json`. Gunakan satu H1 sepanjang maksimal 30 karakter dan paragraf pengantar. Bagian kosong atau tambahan, templat belum terisi, pagar kode tidak seimbang, dan tingkat judul terlewati menggagalkan validasi. Templat berada di `.github/documentation/`.

Jelaskan perilaku yang didukung pada bagian yang sesuai. Riwayat rilis dan kronologi implementasi hanya berada dalam catatan cabang. Paragraf teknis bersama memiliki satu pemilik; dokumen lain menautkan referensinya.

Aset komponen memakai awalan statis publik milik komponen. Aset yang hanya digunakan satu komponen dengan ruang aset sendiri tidak boleh diterbitkan di inti. Aset inti dan aset bersama tetap di inti. Impor CSS membentuk satu blok berurutan alfabetis dengan satu baris kosong sebelum aturan gaya.

Isi setiap peran dengan informasi berguna yang diverifikasi pada sumber, bukan teks baku. Periksa metode, jalur, kolom, izin, nilai baku, persistensi, dan integrasi belum lengkap pada pemiliknya. Prosedur masuk Penggunaan, kontrak implementasi masuk Teknis. Pemeriksaan menolak petunjuk generik serta sumber hilang, tetapi tidak membuktikan kebenaran semua prosa.

Tautan berkas sumber GitHub memakai alias cabang baku `blob/HEAD` atau `raw/HEAD`, termasuk dalam dokumentasi arsip. Tautan komit pada catatan perubahan tetap menunjuk komit permanen.

Label tautan catatan perubahan memakai referensi commit singkat, misalnya tujuh karakter pertama. URL tujuan tetap menyimpan SHA lengkap yang tidak berubah. SHA lengkap dalam label tautan Markdown atau HTML menyebabkan perintah pemeriksaan dokumentasi dan pengujian repositori gagal.

Pemeriksa dokumentasi memvalidasi tujuan topik dan sumber repositori. Pemeriksaan label commit menghitung teks tanpa membuat HTML; hasilnya berupa diagnostik, bukan markup yang disanitasi.
