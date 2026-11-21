# Referensi Teknis

Antarmuka publik dan aturan operasional Belajar.

## Antarmuka

### Kontrak penyedia audio

`study:audio:provider.registerProvider({ id, revision, languages, fetchAudio })` → disposer.

`fetchAudio({ language, label, semanticRole, readings }, signal)` → `{ mediaType, data: Uint8Array }`.

Kedua modul Study memakai kontrak penyedia audio yang sama dan dapat dilepas, serta mengambil rekaman bawaan dengan pembacaan lokal terbatas. Host memiliki otorisasi, kebijakan cache, dan pemutaran komposit.

Rekaman awal memakai model neural multibahasa Kokoro secara offline dengan suara Inggris `bf_emma` dan Jepang `jf_alpha`. Klip memakai 128 kbps, jeda awal 200 ms, jeda akhir 180 ms, normalisasi puncak terbatas, dan ucapan lebih lambat. Atribusi model dan lisensi Apache disimpan di `data/audio/VOICE-LICENSE.txt`; inventaris mencatat suara dan pengolahannya.

Audio baru diambil ketika pelajar meminta pemutaran. Membuka kartu saja tidak membuat permintaan audio. Kegagalan pemutaran memakai toast terlokalisasi host dan log terstruktur. Unsur kalimat mempertahankan deskriptor transformasi terpilih; endpoint audio terautentikasi menurunkan bentuk ucapan dari skema, bukan menerima teks tampilan sembarang. Rekaman awal kombinasi huruf Inggris disintesis dari fonem IPA yang ditulis, sedangkan rekaman alfabet mengucapkan nama huruf.

## Konfigurasi

Pendaftaran bahasa menentukan navigasi dan konten. Modul serta adapter mendaftarkan aktivitas, kamus, dan halaman; penyedia hilang hanya menghapus pilihannya.

## Perilaku

### Audio pelafalan

Bootstrap memerlukan `study:audio:provider` dan mendaftarkan penyedia audio yang dapat dilepas bersama penyedia kamus dan goresan. Penyedia mencocokkan rekaman bawaan berdasarkan label ucapan dan bacaan pilihan, dengan pembacaan berkas terbatas serta kesalahan eksplisit bila audio tidak tersedia. Pelepasan membatalkan pengambilan yang tertunda. Cognis mengotorisasi akses kartu, menurunkan teks transformasi dari skema, dan menyimpan rekaman secara privat melalui Files tanpa mengubah bidang yang ditulis. Alur `study:library:audio` menjalankan otorisasi, validasi, dan resolusi; `study:audio:fetch` memvalidasi serta mengambil byte penyedia. Audio kalimat tetap memutar unsur penyusunnya secara berurutan.

### Audio kamus dan cache host

Jika pelafalan yang diminta tidak tersedia dalam paket, English Study mengambil kata dari English Dictionary API dan mengunduh MP3 yang cocok dari endpoint media pelafalannya. Bacaan IPA pilihan harus cocok; pelafalan lain tidak pernah dipakai sebagai pengganti. Hanya media HTTPS pada `api.dictionaryapi.dev` yang diterima, pengalihan ditolak, pencarian dan unduhan berbagi satu tenggat, dan kedua respons dibatasi ukuran byte saat streaming. Rekaman yang tidak tersedia tetap menghasilkan kesalahan eksplisit. Layanan suara Google tidak digunakan.

Cognis mengelola cache rekaman, bukan modul. Setelah otorisasi, cache Files privatnya memakai ulang rekaman yang berhasil untuk kartu lain dan setelah mulai ulang. Permintaan pemutaran bersamaan berbagi pengambilan dan penyimpanan. Kunci mencakup identitas penyedia, revisi, bahasa, peran, label, dan bacaan; bacaan atau revisi penyedia yang berubah diselesaikan secara terpisah. Permintaan atau penulisan yang gagal dapat dicoba lagi. Modul menghubungi kamus hanya jika pemutaran diminta dan cache tidak tersedia.

### Komposisi dengan jeda dan penggantian manual

Kartu kalimat memiliki bidang audio opsional. Pada pemutaran pertama, Cognis mengotorisasi setiap unsur, memilih hanya kelompok pelafalan pertama, menerapkan transformasi yang dipilih, dan membuat satu WAV berkelanjutan dengan jeda awal serta jeda kata, koma, dan akhir kalimat. Rekaman disimpan secara privat; byte unsur, perubahan bacaan, transformasi, dan jeda menentukan identitasnya. Mekanisme ini berlaku sesuai kebutuhan untuk kartu baru maupun yang sudah ada. Mengunggah audio di penyusun biasa langsung menggantikan pemutaran hasil komposisi. Menghapus berkas eksplisit mengaktifkan komposisi otomatis lagi. Penyedia memasok klip kata; Cognis mengelola komposisi dan kebijakan cache.

### Pertahankan audio varian kalimat

Komposisi kalimat meminta label dan pelafalan utama dari transformasi terpilih, termasuk jalur bertingkat. Jika rekaman varian tidak tersedia, pemutaran gagal secara jelas alih-alih menelusuri referensi pelafalan bentuk dasar. Aturan yang sama berlaku untuk pemutaran varian langsung dan penyusun bertingkat.

### Spesifikasi teknis

`{ "entryIds": ["entry-id"] }` → `{ "data": { "entryIds": ["entry-id"], "entries": [{ "id": "entry-id", "label": "..." }] } }`

Ambil terjemahan yang belum tersedia menggunakan `POST /api/v1/study/library/definitions/localize` dengan `{ translations, languages }`. Bahasa UI yang belum tersedia diminta melalui `localization:translateString`, terjemahan yang diberikan tetap dipertahankan, dan `missingLanguages` dilaporkan jika penyedia tidak tersedia atau gagal. Teks yang belum diterjemahkan dapat diedit; teks Inggris tidak disalin ke bidang bahasa lain. Tindakan ini juga tersedia saat menambahkan definisi secara manual.

### Navigasi Study

Halaman Study berbagi satu slot subnavigasi composer, memakai label navigasi dan tindakan bersama dari ui.reuse dalam keempat bahasa, serta menentukan rute aktif saat dirender. Lingkup router yang dibatalkan tetap dibatalkan ketika diganti. Kegagalan pratinjau gambar menampilkan notifikasi galat terlokalisasi dan membuka kunci status agar dapat dicoba lagi.

Kemajuan menggambar menyimpan setiap ID percobaan yang telah dikirim bersama penghitungnya, sehingga pengiriman ulang A setelah B maupun setelah mulai ulang tidak meningkatkan kesulitan panduan lagi. Integrasi kemajuan dan imbalan tervalidasi yang sama tetap aktif.

Flashcards memakai `/study/<iso>/flashcards` dan `/study/<iso>/flashcards/<deck-id>`. Kontrol bahasa membuka galeri terkait tanpa membawa dek bahasa lain. `/study/flashcards` menentukan bahasa saat ini. Pustaka dan Permintaan tetap merupakan halaman bersama.

### Navigasi Ringkas

Pada ponsel dan tablet, tautan halaman Study memakai baris bergulir mendatar dan menampilkan halaman terpilih setelah ukuran atau fon berubah. Bahasa, pencarian kamus, dan pengaturan berbagi baris berikutnya. Ikon pencarian membuka dialog yang mempertahankan formulir asli, penyedia terpilih, dan isian. Penutupan mengembalikan fokus; navigasi atau perubahan ke ukuran desktop menutup dialog. Ikhtisar memakai pengguliran dokumen. Saat digulir, navigasi utama tetap tersedia dan baris merek dilipat.

Nama bahasa dipersingkat menjadi kode bahasa lalu bendera ketika ruang terbatas. Nama lengkap tetap tersedia sebagai label aksesibel dan tooltip. Bahasa tanpa bendera tetap menampilkan kode. Saat ruang bertambah, nama lengkap ditampilkan kembali.

### Spesifikasi teknis

Galeri menentukan bahasa dari jalur dan memfilter deck yang terlihat melalui kontrak publik Study. URL detail menyebut bahasa serta UUID deck; pergantian bahasa kembali ke galeri yang sesuai. Navigasi tidak membawa data kueri sementara.

Study menggunakan `navigationLabels` terlokalisasi dari deskriptor rute adapter aktif untuk tautan milik adapter, termasuk Permintaan. Kunci label tersebut tidak dicari melalui paket bahasa gateway. Label dipilih berdasarkan lokal UI yang tepat, bahasa dasarnya, lalu bahasa Inggris; tautan milik Study tetap memakai sumber daya XML gateway.

### Ukuran panel gambar konsisten

Panel gambar mengambang dibuka dalam bingkai besar yang tidak bergantung pada rasio aspek kata atau pola. Pergantian kartu mempertahankan posisi dan ukuran yang disesuaikan pengguna; proporsi gambar tetap terjaga.

### Simpan kemajuan menggambar

Status penyelesaian dan jumlah goresan yang disembunyikan disimpan per akun dan kartu melalui penyimpanan preferensi. Setiap percobaan, pengaturan ulang, dan pengulangan memilih posisi acak berbeda berdasarkan jumlah tersebut. Penyelesaian dengan paling banyak satu kesalahan menambah jumlahnya satu, dibatasi jumlah goresan pola saat ini. Pola yang pernah diselesaikan tetap memandu goresan berikutnya, sedangkan pola yang belum selesai menampilkan seluruh pola sebelum masukan. Permintaan GET dan POST terautentikasi ke `/api/v1/study/drawing/:cardId` menjalankan alur `study:drawing:readProgress` dan `study:drawing:complete`; peramban tidak mengirim identitas akun.

Goresan terakhir yang diterima langsung menyimpan penyelesaian dan tingkat kesulitan berikutnya. Menutup papan gambar atau meninggalkan Explore tidak membatalkan penyimpanan. Membuka kembali kartu yang sama dan mencoba lagi menunggu kemajuan tersimpan sebelum memilih goresan tersembunyi.

### Sembunyikan jawaban menulis

Judul pad mula-mula menyamarkan karakter dengan tombol standar untuk membukanya. Memuat karakter lain menyamarkannya kembali. Sesi mengambang menyediakan kartu aktif melalui kapabilitas yang dapat dilepas `study:drawing:observe`. Pratinjau Library yang cocok tetap terbuka, diburamkan, dan tidak interaktif sampai pad berganti karakter atau ditutup; bacaan dan arti tetap tersedia di pad. Mode Menulis tertanam memakai penyamaran yang sama serta melaporkan pembukaan karakter sebagai percobaan berbantuan.

### Kontrol Belajar Tersimpan

Pilihan kamus menggunakan theme-select dan disembunyikan jika hanya ada satu penyedia. Pengaturan berada di kanan input pencarian kamus. KANJIDIC2 memperkaya data kanji dan bukan pilihan pencarian sejajar dengan Jisho; sumber referensi menggunakan nama katalog sebenarnya.

Mode Reading/Writing disimpan sebagai preferensi akun dalam menu mengambang composer; defaultnya Reading. Perubahan saat latihan meminta konfirmasi melalui popup peringatan bersama sebelum mengulang antrean. Pembatalan mempertahankan posisi dan jawaban; ulasan yang telah dikirim tetap tersimpan. Bilah samping mencakup Semua dan menandai dek aktif. Judul menulis memburamkan glif pengganti berukuran sama. Klik pertama menampilkan karakter dan mengaktifkan tautan Explore; klik kedua meminta konfirmasi navigasi. Aktivasi papan ketik mengikuti interaksi yang sama.

### Navigasi Panel Menulis

Membuka panel menulis dari detail kartu menutup popup detail setelah panel berhasil terbuka. Judul tersembunyi tetap ditampilkan pada klik pertama. Di Explore, klik berikutnya membuka kartu langsung; halaman Study lainnya tetap meminta konfirmasi sebelum berpindah ke Explore.

Pilihan jawaban kartu belajar berupa tombol jawaban tersendiri. Judul kartu dan jawaban yang diungkap menggunakan tindakan dalam aplikasi dengan konfirmasi keluar dan urutan dek yang tetap terjaga, tanpa menampilkan URL kartu saat diarahkan penunjuk. Di Explore, klik kedua pada judul gambar yang telah diungkap membuka kartu langsung melalui tindakan tanpa URL.

Latihan menulis hanya menggunakan judul tersamarkan pada papan gambar. Panah SVG sebelumnya/berikutnya berada di atas papan bersama kontrol favorit; berikutnya tetap memerlukan jawaban. Flashcards meneruskan `suppressRetry: true` ke papan bersama untuk menyembunyikan dan menonaktifkan percobaan ulang; latihan mandiri tetap mengizinkannya secara bawaan.

Pengguna papan tertanam dapat menyediakan `onNavigate(card)` setelah konfirmasi judul bersama. Flashcards menggunakannya untuk mencatat percobaan saat ini melalui alur keluar dan mempertahankan konteks navigasi dek sebelum membuka Explore.

### Aksi Peramban yang Diperluas

Klien Library di peramban memperoleh `study:library:client` melalui ctx. Penyedianya mendaftarkan `study:library:<clientFunction>` dengan tahap `before`, `execute`, dan `after` untuk pembacaan, kamus, permintaan, impor, dan media. Kapabilitas yang diwajibkan rute memuat penyedia sebelum halaman dipasang. Lihat dokumentasi adaptor Library untuk argumen ekstensi, penolakan, dan pelepasan.

### Patuhi Autentikasi Study

Study memerlukan gateway Authentication dan kapabilitas `auth:routeContext` sebelum mendaftarkan rute. Administrasi adaptor, penemuan bahasa, dan rute menggambar menggunakan konteks yang disuntikkan, termasuk pemeriksaan akses khusus. Kontrak autentikasi yang tidak tersedia menggagalkan bootstrap alih-alih memilih pemeriksaan bawaan.

### Pemilihan Latihan Merata

Panduan menggambar dan pengacakan jawaban kartu belajar menggunakan pembantu `randomIndex` yang sama. Pembantu ini menggunakan Web Crypto dengan pengambilan sampel penolakan bermasker untuk rentang bilangan bulat dari 1 hingga 2^32 tanpa bias modulo. Rentang dengan satu posisi tidak membutuhkan entropi. Pemanggil dapat menyuntikkan sumber entropi untuk pengujian deterministik; latihan biasa selalu menggunakan Web Crypto.

### Isolasi dan siklus komponen

API mendelegasikan ruang nama ekstensi melalui kebijakan milik gateway aktif; Study memiliki aturan ruang nama bahasa. Kapabilitas penyedia Library ditarik saat adaptor atau dependensi Study dinonaktifkan, menolak referensi fungsi yang disimpan, dan kembali saat diaktifkan. Bootstrap adaptor Study menyediakan `onAvailabilityChange(listener)` untuk kontribusi sesuai siklus hidup; kegagalan bootstrap menarik kontribusi tersebut.

### Belajar Offline

Mode Offline aktif secara bawaan di Pengaturan. Menonaktifkannya memulihkan peringatan koneksi dan pesan kesalahan yang ada serta menonaktifkan fallback worker. Saat aktif, hilangnya koneksi mengalihkan aplikasi ke mode offline tanpa pemberitahuan kesalahan; navigasi yang tidak tersedia diblokir tanpa popup kesalahan.

Study menyimpan snapshot JSON ringan dengan batas ukuran di tab saat ini: skema, data karakter/kartu yang diizinkan, lokasi, ID yang telah dilihat, favorit, dan dek yang pernah dibuka. Skema bahasa mengaktifkannya melalui `metadata.offline: { cache: "lightweight" }`. Cache Library menampung paling banyak 16 MB dan 100 pembacaan; cache baca lain paling banyak 4 MB dan 100 pembacaan. Byte audio, respons kamus, kredensial, dan dokumen terautentikasi tidak disimpan secara permanen.

Pratinjau Explore memakai data cache yang telah diotorisasi. Menggambar dan latihan kartu bekerja secara lokal. Penyelesaian, ulasan, ID yang dilihat, dan status akhir favorit diantrekan; progres, XP, dan hadiah menjadi resmi setelah konfirmasi server. Audio serta permintaan kamus/ElevenLabs berhenti. Penyuntingan, penghapusan, dan berbagi memerlukan koneksi. Hanya konten yang pernah dimuat dalam batas cache yang tersedia.

Study privat memerlukan sesi akun yang sama, pernah diverifikasi, dan belum kedaluwarsa di tab yang sama. Muat ulang privat secara luring memerlukan koneksi; kunjungan pertama ke hub di tab terverifikasi dapat dilakukan setelah persiapan latar belakang. Perubahan akun/sesi, preferensi, siklus hidup modul, dan pelepasan penyedia membatalkan snapshot privat. Pencabutan akses server tidak dapat diketahui saat terputus. Pemulihan memakai penjaga perubahan yang belum disimpan lalu memuat ulang otorisasi server.

### Antrean dan Persetujuan

Host menyediakan `offline:outbox`, `offline:state`, dan `offline:accessPolicy` melalui ctx. Komponen mendaftarkan pengirim selama masa hidup penyedia dan ID operasi stabil melalui `offline:enqueue`; `offline:flush` mengotorisasi dan mengirim. Antrean permanen per akun dibatasi 1.000 catatan dan 1 MB selama tujuh hari, tanpa token. ID serta waktu asli dipertahankan; kegagalan sementara dicoba ulang, catatan yang dikonfirmasi atau ditolak permanen dihapus. Penolakan menampilkan peringatan terlokalisasi. Keluar menghapus antrean akun; pergantian akun tidak mengirim data akun lain. Menonaktifkan Mode Offline menghentikan catatan baru. Antrean lama tetap dapat dikirim saat online.

Pemulihan memperbarui penyedia dan menjalankan `authenticate-session` sebelum tahap akhir `afterSession` mengirim aktivitas. Penyedia wajib mendeklarasikan `offlineAccessGuard` dalam katalog server. Persyaratan yang tidak diketahui atau persetujuan yang belum ada memblokir akses offline. Terms of Service menyimpan versi dokumen terakhir yang diambil dan persetujuan terkonfirmasi server per akun. Versi baru yang belum disetujui langsung memblokir pembacaan, navigasi, dan catatan offline serta pengiriman sampai persetujuan online berhasil. Persetujuan offline tidak tersedia. Snapshot privat tetap di tab; hanya antrean terbatas dan snapshot dokumen hukum bertahan setelah muat ulang. Tahap awal `beforeSession` menghapus verifikasi pengiriman sebelumnya sebelum setiap autentikasi.

### Halaman Study luring kosong

Perilaku ini dijelaskan dalam [kontrak bersama](/docs/api/technical).

### Aset Study Luring

Study menyiapkan ikon popup, templat gambar, gaya gambar, dan ikon tutup saat daring tanpa membuka papan gambar atau menghalangi login. Persiapan dicoba kembali setelah koneksi pulih dan berhenti bersama penyedianya. Karakter yang sudah tersimpan dapat membuka papan gambar untuk pertama kali saat luring. Penyuntingan konten tidak tersedia saat luring; popup detail yang terbuka menonaktifkan Sunting ketika koneksi hilang. Ikon popup dekoratif yang tidak tersedia mempertahankan label tindakan terjemahannya tanpa membuka dialog kesalahan sumber daya.

### Ketersediaan Luring

Perilaku ini dijelaskan dalam [kontrak bersama](/docs/api/technical).

### Favorit Study Bersama

Perilaku ini dijelaskan dalam [kontrak bersama](/docs/api/technical).

### Ruang Kerja Luring

Setelah masuk terverifikasi, Study menyiapkan skema, lokasi yang dapat dibaca, formulir, penanda dilihat, dan koleksi ringan yang diizinkan untuk bahasa belajar serta mengajar yang diikuti. Flashcards menyiapkan daftar dan semua dek sesuai yang terlihat beserta detail kartu dalam batas cache yang ada. Perubahan keikutsertaan memicu persiapan ulang. Dua worker membatasi pembacaan bersamaan; penghentian penyedia, pergantian akun, penolakan akses, dan persetujuan hukum tersimpan tetap diberlakukan. Halaman tidak perlu dikunjungi sebelumnya; cuplikan privat tetap terikat tab dan sesi terverifikasi.

### Latihan Study Luring

Pengelolaan Library serta halaman pengeditan, pencarian, dan permintaannya memerlukan koneksi. Submenu Study tetap menampilkan tautan tersebut tetapi menonaktifkannya saat luring, termasuk segera setelah koneksi terputus. Explore tetap tersedia untuk membaca konten tersimpan dan menggambar. Penyedia Library hanya mendaftarkan Explore sebagai rute sesi luring.

Perilaku ini dijelaskan dalam [kontrak bersama](/docs/api/technical).

### Transisi dan Navigasi Lancar

Navigasi Study langsung memakai snapshot sesi terverifikasi, dengan validasi gabungan paling sering setiap tiga puluh detik. Permintaan metadata awal dibatasi lima detik dan penemuan kamus opsional tiga detik. Penolakan akses resmi membatalkan snapshot, perubahan keikutsertaan atau modul membatalkan data navigasi, dan penemuan subhalaman yang gagal dapat dicoba ulang.

### Tujuan Luring Tetap Terlihat

Tujuan yang tidak tersedia tetap terlihat dengan gaya nonaktif yang sama pada navigasi utama, menu pengguna, dan submenu Study. Library serta tautan pengelolaan dan permintaan tetap tercantum tetapi nonaktif saat luring, lalu aktif kembali setelah terhubung. Izin Study tetap menentukan entri yang tersedia. Tautan nonaktif tidak memuat rute atau membuka pemberitahuan pemulihan, termasuk navigasi bahasa dan pengaturan Study yang membawa status halaman. Explore dan Flashcards yang tersimpan tetap dapat diakses.

### Favorit yang Dikonfirmasi

Perilaku ini dijelaskan dalam [kontrak bersama](/docs/api/technical).

## Keamanan

### Akses Dashboard dan Study

Dashboard menyatakan akses luring privat yang hanya berlaku dalam sesi dan mempertahankan ringkasan akun serta acara mendatang yang tersimpan. Ekstensi Dashboard opsional yang diambil dari server dilewati saat dibuka kembali secara luring. Penyedia Study mendaftarkan rute hub dan menggunakan snapshot katalog bahasa, preferensi belajar, serta tautan modul yang terikat akun dan sesi melalui alur `study:navigation`. Pemuatan bilah navigasi menyiapkan metadata ringan hub. Explore dan kartu belajar tetap menggunakan deklarasi rute milik penyedianya; halaman yang tidak didukung tetap memakai pemulihan tanpa dialog kesalahan. Kontrol pemilihan bahasa belajar memerlukan koneksi.

## Referensi

### Cakupan inventaris referensi

Katalog referensi Jepang memuat seluruh 13.108 karakter dari salinan resmi KANJIDIC2 yang dipaketkan. Katalog Inggris memuat seluruh 135.969 entri leksikal Open English WordNet dengan 127.311 kunci ternormalisasi. Keduanya adalah penyedia kamus terpisah yang dimuat sesuai kebutuhan, bukan 149.077 kartu awal yang langsung diimpor. Pilih Kamus Referensi dalam pencarian Study untuk mengimpor entri yang didukung melalui validasi graf biasa. Rekaman tanpa makna atau bacaan yang dapat digunakan tetap tidak diketahui; pelafalan, terjemahan, dan diagram goresan tidak dibuat-buat. Inventaris ini bukan seluruh Han Unicode dan bukan daftar semua kemungkinan kata bahasa Inggris.

Bacaan Kanji diurutkan berdasarkan bukti umum JMdict dan penanda frekuensi yang tersedia, termasuk bentuk okurigana; tautan kelompok dan audio awal mengikuti urutan yang sama. Audio Kanji selalu memakai pelafalan pertama yang ditulis. Kartu kata Inggris yang ada memiliki satu IPA; entri referensi mempertahankan urutan sumber dalam ragam Britania pilihan sebelum ragam lain. Frekuensi pelafalan bergantung pada konteks dan sumber tidak menyediakan peringkat universal untuk setiap bacaan.

Bangun ulang pecahan referensi dengan `python3 scripts/import-reference.py --source <source-file>`; bahasa Jepang menerima `--priorities <reading-priorities.json>`. `data/reference/manifest.json` mencatat checksum sumber, atribusi, jumlah, dan digest pecahan. Hanya pecahan untuk kunci yang diminta dimuat; hasil saat runtime memakai cache Cognis.

### Rekaman bacaan utuh untuk referensi

Bahasa Jepang juga menyertakan 2.913 klip neural bacaan utuh dalam bank berkas terbatas di `data/audio/reference/`. Bersama rekaman awal, klip ini mencakup bacaan utama seluruh 12.356 karakter sumber yang memiliki bacaan; 752 karakter lainnya tidak diberi audio yang dibuat-buat. Indeks memilih bacaan pertama yang ditulis serta memeriksa batas berkas dan pembatalan. Buat rencana dengan `python3 scripts/reference-audio.py plan --work <directory>`, proses inventarisnya dengan skrip sintesis, lalu gunakan `pack` untuk menulis bank terbatas.

Alat pemeringkat Jepang menerima `--dictionary <JMdict.gz> --kanji-dictionary <KANJIDIC2.xml.gz> --output <priorities.json>` serta opsi `--content-root data/library/content`. Alat mengutamakan bacaan leksikal mandiri yang umum, mengurutkan bacaan lain dari penyelarasan kata terverifikasi berbobot frekuensi, dan mempertahankan pilihan kartu tunggal yang ditinjau dalam `data/audio/primary-readings.json`. Penyuarakan dan geminasi dipetakan kembali ke bacaan sumber kanonis. Bacaan kun, on, dan nama tetap tersedia; hanya bacaan pertama yang dipilih menentukan pemutaran dan identitas cache. Penanda frekuensi membantu pengurutan dan bukan ukuran frekuensi pelafalan universal.

Komposisi otomatis memerlukan rekaman untuk unsur yang diucapkan. Rekaman yang tidak tersedia tetap menghasilkan kesalahan eksplisit dan dapat ditambahkan melalui bidang unggahan audio biasa. Ejaan referensi yang tidak dapat ditautkan ke alfabet paket mempertahankan teks sumber dan definisinya tanpa tautan ejaan yang dibuat-buat.

### Panduan goresan yang konsisten

Sebelum masukan pertama, pola yang belum pernah diselesaikan menampilkan seluruh goresan. Setelah masukan dimulai, hanya goresan berikutnya yang dipandu, termasuk saat berpindah karakter. Pola yang pernah diselesaikan langsung memakai panduan goresan berikutnya, dengan pengujian goresan tersembunyi dan tombol pengungkap tetap tersedia.

### Spesifikasi Teknis

| Halaman / bagian                 | Panduan            | Akses          |
| -------------------------------- | ------------------ | -------------- |
| `/study`                         | Ringkasan Study    | Pengguna masuk |
| `^/study/(?:settings\|welcome)$` | Preferensi Belajar | Pengguna masuk |
