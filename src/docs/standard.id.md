# Standar Penulisan Dokumentasi

## Ikhtisar

Dokumen ini mendefinisikan cara dokumentasi ditulis dan diorganisir dalam basis kode Cognis. Setiap gateway, adapter, modul, dan komponen tingkat platform menyertakan dokumentasinya sendiri sebagai file Markdown, yang ditemukan secara otomatis oleh rute docs dan disajikan melalui browser dokumentasi dalam aplikasi.

Tujuannya adalah konsistensi: kontributor yang membaca dokumen apapun harus segera mengenali struktur bagian, menemukan apa yang mereka butuhkan, dan mengetahui cara menulis dokumen baru yang sesuai dengan pola yang sama. Dokumen ditulis untuk kontributor pengembang, bukan pengguna akhir. Diasumsikan pembaca memahami HTTP, Node.js, dan TypeScript.

Dokumentasi berada berdampingan dengan kode yang dijelaskannya. Dokumen gateway ada di `src/gateways/<id>/docs/`, dokumen adapter ada di `src/adapters/<gateway-id>/<adapter-id>/docs/`, dan dokumen lintas komponen tingkat platform ada di `src/docs/`. Rute docs secara otomatis menemukan semua direktori `docs/` saat startup sehingga menambahkan dokumen baru tidak memerlukan registrasi terpusat.

## Tanggung Jawab

- Mendefinisikan struktur bagian kanonik untuk semua dokumentasi komponen.
- Mendefinisikan tata letak root kanonik untuk modul, gateway, adapter, dan permukaan inti.
- Mendefinisikan konvensi penamaan file dan persyaratan bahasa.
- Mendefinisikan tingkat kedalaman agar penulis mengetahui seberapa detail setiap dokumen seharusnya.

Tidak bertanggung jawab atas: memaksakan keberadaan dokumen (itu adalah urusan code review), pemeriksaan ejaan otomatis, atau validasi tautan.

## Arsitektur

### Tata letak root komponen kanonik

Komponen baru atau yang ditata ulang harus mengerucut ke nama concern tingkat atas yang sama agar kontributor tidak perlu mempelajari ulang setiap pohon direktori. Saat sebuah komponen mengekspos permukaan dokumentasi, server, atau browser, sediakan nama direktori `docs/`, `api/`, atau `ui/` yang cocok di root komponen dan jaga file entrypoint-nya tetap mudah ditebak.

| Keluarga                | Root                           | Root kanonik           | Catatan                                                                                                                                                                              |
| ----------------------- | ------------------------------ | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Platform / lapisan inti | `src/`                         | `docs/`, `api/`, `ui/` | `src/docs/` menampung dokumentasi pengembang, `src/api/` kode HTTP/server, dan `src/ui/` aset browser. `src/core/` tetap menjadi lapisan kontrak dan layanan yang agnostik penyedia. |
| Gateway                 | `src/gateways/<id>/`           | `docs/`, `api/`, `ui/` | Handler server, registrasi rute, dan helper bootstrap milik gateway ditempatkan di `api/`; aset admin/browser ditempatkan di `ui/`.                                                  |
| Adapter                 | `src/adapters/<gateway>/<id>/` | `docs/`, `api/`, `ui/` | Gunakan `api/` untuk helper bootstrap atau server milik adapter dan `ui/` untuk aset browser milik adapter saat adapter mengeksposnya.                                               |
| Modul                   | `<module-repository>/`         | `docs/`, `api/`, `ui/` | `docs/` dan `ui/` adalah rumah stabil untuk dokumentasi modul dan aset browser. `api/` adalah rumah stabil untuk kode server milik modul.                                            |

Direktori pendukung seperti `tests/`, `languages/`, `sql/`, `templates/`, `bootstrap/`, `cli/`, `db/`, `content/`, dan `reuse/` boleh hidup berdampingan dengan root tersebut, tetapi hanya melengkapinya dan tidak boleh menggantikannya. Untuk komponen baru atau yang ditata ulang, utamakan `api/routes/` daripada direktori saudara `routes/` di level atas, dan gunakan `docs/index.<lang>.md` alih-alih nama entry dokumentasi khusus.

### Struktur bagian

Setiap file dokumen adalah file Markdown. Bagian-bagian muncul dalam urutan ini; hilangkan sebuah bagian hanya ketika secara eksplisit dicatat dalam aturan tingkat kedalaman:

**1. `# Nama Komponen`** — Judul H1 yang jelas. Gunakan nama lengkap yang dapat dibaca dari komponen, bukan string pengenal (misalnya `# Gateway Autentikasi`, bukan `# auth`).

**2. `## Ikhtisar`** — Dua hingga empat paragraf yang ditujukan untuk pengembang yang baru mengenal basis kode. Jelaskan apa komponen ini, masalah apa yang diselesaikannya, dan mengapa komponen ini ada di Cognis. Hindari jargon; simpan detail teknis untuk Arsitektur. Contoh:

> Gateway Autentikasi adalah satu-satunya titik masuk untuk semua operasi login dan identitas di Cognis. Ini memisahkan sisa platform dari penyedia kredensial tertentu dengan berada di antara penangan rute dan adapter auth konkret. Menambahkan penyedia identitas baru — LDAP, SAML, atau sistem internal kustom — hanya memerlukan adapter baru; tidak ada penangan rute yang perlu diubah.

**3. `## Tanggung Jawab`** — Daftar poin tentang apa yang dimiliki dan bertanggung jawab atas komponen ini. Ikuti daftar dengan catatan singkat yang dimulai dengan `Tidak bertanggung jawab atas:` yang menarik batas yang jelas, misalnya `Tidak bertanggung jawab atas: menyimpan data profil pengguna (itu adalah urusan gateway profil)`.

**4. `## Arsitektur`** — Keputusan desain utama, alur data, dan antarmuka kunci. Campur prosa dengan kutipan jalur file seperti `src/gateways/auth/gateway.ts` dan cuplikan kode singkat yang menunjukkan antarmuka atau tanda tangan tipe kunci di mana informatif. Bagian ini harus menjawab pertanyaan "bagaimana cara kerjanya pada tingkat tinggi?"

**5. `## Konfigurasi`** — Variabel lingkungan atau bidang manifes yang disentuh operator saat menerapkan atau mengonfigurasi komponen ini. Sajikan sebagai tabel dengan kolom `Variabel | Default | Deskripsi`. Hilangkan bagian ini sepenuhnya jika tidak ada yang dikonfigurasi operator.

**6. `## Titik Ekstensi`** — Bagaimana kontributor lain dapat memperluas atau terhubung ke komponen ini: antarmuka apa yang diimplementasikan, metode apa yang mendaftarkan ekstensi, bagaimana tampilan siklus hidupnya. Hilangkan jika komponen tidak memiliki titik ekstensi.

**7. `## Rute API`** — Tabel rute HTTP dengan kolom `Metode | Jalur | Deskripsi | Auth`. Sertakan semua rute yang didaftarkan oleh komponen ini. Hilangkan jika komponen tidak mendaftarkan rute.

### Tingkat kedalaman

Berbagai jenis komponen membutuhkan kedalaman yang berbeda:

| Tingkat         | Komponen                       | Bagian yang diperlukan                                     |
| --------------- | ------------------------------ | ---------------------------------------------------------- |
| Platform / inti | Dokumen platform `src/docs/`   | Semua bagian sepenuhnya                                    |
| Gateway         | `src/gateways/<id>/docs/`      | Arsitektur lebih ringan; sertakan Konfigurasi + Rute API   |
| Adapter         | `src/adapters/<gw>/<id>/docs/` | Standar penuh (semua bagian yang berlaku)                  |
| Modul           | `<module-repository>/docs/`    | Standar penuh; sertakan Rute API saat modul menyediakannya |

### Cuplikan kode

- Gunakan indentasi dua spasi di semua blok kode.
- Gunakan tanda kutip tunggal untuk literal string TypeScript/JavaScript.
- Jangan tambahkan komentar ke cuplikan kode kecuali menjelaskan kendala yang tidak jelas.
- Referensi jalur file menggunakan bentuk relatif repo: `src/gateways/auth/gateway.ts`.

### Tabel

Gunakan sintaks pipa dengan baris pemisah header:

```
| Kolom A | Kolom B | Kolom C |
| ------- | ------- | ------- |
| nilai   | nilai   | nilai   |
```

## Konfigurasi

Standar ini berlaku untuk semua dokumentasi di repositori Cognis. Tidak diperlukan konfigurasi runtime.

## Titik Ekstensi

Untuk menambahkan dokumen baru untuk sebuah komponen:

1. Buat subdirektori `docs/` di dalam direktori komponen.
2. Tambahkan `index.en.md` sebagai dokumen bahasa Inggris utama mengikuti struktur bagian di atas.
3. Tambahkan terjemahan sebagai `index.de.md`, `index.ja.md`, `index.id.md` dengan nilai dalam bahasa target.
4. Rute docs menemukan file secara otomatis pada startup server berikutnya.

Untuk dokumen tingkat platform yang mencakup beberapa komponen, tambahkan `<name>.en.md` langsung ke `src/docs/` (misalnya `src/docs/acl-matrix.en.md`). Ini disajikan pada slug `<name>`.

### Penamaan file

| Lokasi                          | File utama     | File terjemahan                                |
| ------------------------------- | -------------- | ---------------------------------------------- |
| Platform (`src/docs/`)          | `<name>.en.md` | `<name>.de.md`, `<name>.ja.md`, `<name>.id.md` |
| Komponen (subdirektori `docs/`) | `index.en.md`  | `index.de.md`, `index.ja.md`, `index.id.md`    |

Semua empat bahasa (en, de, ja, id) diperlukan untuk string apapun yang terlihat di UI. Browser docs kembali ke `.en.md` ketika terjemahan tidak ada.

### Persyaratan bahasa

Setiap nilai string dalam dokumen yang diterjemahkan harus ditulis dalam bahasa yang diwakili file tersebut. Satu-satunya pengecualian adalah nama merek (`Cognis`), akronim teknis universal (`LDAP`, `TLS`, `STARTTLS`), placeholder format, dan tagline Latin (`Disce. Loquere. Vive.`).

Jika Anda mengubah dokumen Markdown yang memiliki varian terjemahan, perbarui file bahasa terkait dalam perubahan yang sama agar semua bahasa yang didukung tetap selaras.

## Konvensi dokumentasi fungsi

Templat kontribusi tersembunyi `.github/DOCUMENTATION_TEMPLATE.en.md` menentukan urutan pembuka wajib untuk setiap berkas dokumentasi nyata. Tepat setelah H1, awali dengan pernyataan informatif tentang apa yang dicapai fungsi atau permukaan yang didokumentasikan. H2 berikutnya berisi contoh penggunaan konkret untuk impor, pencarian kapabilitas, panggilan rute, konfigurasi, dan hasil yang diharapkan. H2 setelahnya memulai spesifikasi teknis lengkap; tempatkan seluruh input, output, perilaku siklus hidup, validasi, otorisasi, kesalahan, efek samping, persistensi, keamanan, pembersihan, dan detail ekstensi di sana atau pada subbagian H3. Pengujian arsitektur membandingkan tiga tingkat heading pertama setiap dokumen non-changelog dengan templat tersembunyi.
