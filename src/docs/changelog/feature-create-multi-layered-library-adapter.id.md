# Pustaka Studi Terpadu

**Cabang Fitur:** feature-create-multi-layered-library-adapter

## Lapisan yang dapat dilacak

Adaptor Pustaka Studi menambahkan lapisan tetap untuk sistem tulisan, definisi, materi bahasa, latihan, rangkaian latihan, rutinitas, dan koleksi. Referensi terarah menghubungkan setiap materi dengan unsur pembentuknya.

## Cakupan yang aman

Cakupan global, kelas, dan pengguna privat memiliki kontrol akses berdasarkan peran dan keanggotaan. Permintaan publikasi memerlukan persetujuan tujuan dan menyalin semua dependensi terkait bersama-sama.

## Impor, ekspor, dan UI

Pustaka tersedia melalui ctx dan API terautentikasi, termasuk impor JSON global tervalidasi, ekspor JSON dan Anki, penguraian kata Unicode, penelusuran mendalam, serta halaman Study untuk semua pengguna.

## Templat yang dapat dipilih

Modul bahasa dan aktivitas dapat menyalin hanya lapisan templat baku yang diperlukan. Metadata tautan antarlapisan mempertahankan hubungan yang sah, menandai ketergantungan wajib, serta menyimpulkan tautan karakter ke kata dan kata ke kalimat.

## Tetapkan desain ulang kerangka relasi

Menambahkan rencana implementasi bertahap untuk mengganti lapisan Pustaka tetap dengan skema milik konsumen, relasi generik yang ditegakkan, flow resolusi dan lookup yang dapat dipasang, UI detail entri lengkap, deep link, serta migrasi yang dapat dipulihkan.

## Jalankan desain ulang

Lapisan tetap diganti dengan skema konsumen berversi yang disimpan. Bidang bertipe, kardinalitas, edge berurutan, versi skema, dan target relasi yang terlihat kini ditegakkan. Resolusi grafem Unicode dan penyedia lookup yang dapat dilepas serta mencatat asal data juga ditambahkan.

## Telusuri relasi sepenuhnya

API netral untuk skema, detail, penelusuran, resolusi, dan lookup serta UI berbasis skema kini menampilkan lapisan apa pun, bidang, komponen, dan penggunaan masuk melalui URL detail yang aman dimuat ulang.

## Perubahan capability inkompatibel

Kapabilitas skema yang inkompatibel diperkenalkan pada adapter 2.0.0; ingesti paket deklaratif menaikkannya ke 2.1.0. Konsumen harus mendaftarkan skema dan memakai ID skema serta relasinya sebagai pengganti katalog tetap, kloning templat, dan metode impor atau ekspor khusus lapisan yang telah dihapus.

## Tambahkan paket bahasa deklaratif

Paket bahasa kini dapat menyerahkan direktori khusus data kepada kapabilitas Pustaka untuk diperiksa secara deterministik dan diingesti secara atomik. Cognis memvalidasi keamanan jalur, manifes, lisensi, skema, seluruh rekaman dan relasi, membuat ID bernamespace yang stabil, serta menyimpan tanda terima instalasi berversi. Kerangka bahasa sekarang mendokumentasikan manifes, skema, direktori lapisan, berkas rekaman, dan pemisahan dari adapter resolver atau lookup yang dapat dieksekusi.

## Rekaman definisi terlokal

Lapisan definisi kini mendeklarasikan pemetaan kunci string milik modul. Formulir pembuatan Pustaka meminta setiap bahasa antarmuka Cognis dengan hanya bahasa Inggris yang wajib, menghasilkan kunci stabil yang terikat ke ID entri definisi, dan menyediakan kapabilitas penerjemahan ctx opsional bagi penyedia mendatang.

## Matangkan penjelajah Perpustakaan

Perpustakaan kini menggunakan tab lapisan, entri berbentuk kartu, dan detail melalui popup pakai ulang. Pemilihan entri dan penelusuran relasi kini dikelola di balik layar tanpa menampilkan pengenal rekaman pada URL peramban, sedangkan kontrol sebelumnya dan berikutnya memakai navigasi berarah dengan lebar yang sama. Subnavigasi Belajar juga memberi setiap kontrol ruang yang cukup agar tidak terpotong saat disorot.

## Integrasikan konten pendukung

Definisi dan partikel kini tidak ditampilkan dalam penjelajahan langsung Pustaka. Detail entri menempatkan definisi terlokalisasi di bawah judul, menyertakan partikel kalimat sebagai detail relasi hanya-baca, menampilkan metadata lencana sebagai pil, menandai cakupan dengan ikon SVG yang aksesibel, dan menyediakan setiap bidang lencana sebagai filter kartu.

## Sempurnakan filter dan detail Pustaka

Dropdown metadata Pustaka kini memakai gaya tema bersama dan langsung menerapkan perubahan. Popup detail memakai judul yang lebih besar, menempatkan definisi dan makna di bawah judul, serta menyajikan unsur penyusun yang dikenali sebagai subkotak yang dapat dinavigasi di dalam judul alih-alih bagian Komponen terpisah.

## Tambahkan filter pil dan audio bersama

Dropdown metadata diganti dengan pil filter yang dapat dikelompokkan, dan navigasi Belajar kembali memisahkan halaman di kiri dari kontrol bahasa di kanan. Skema unit tulisan kini mewajibkan pelafalan dan audio; modul dapat menyediakan audio lokal atau sumber HTTPS yang diunduh Cognis satu kali ke cache lokal bersama yang dilindungi akses.

## Pulihkan pemuatan dan penyimpanan gateway

Perenderan Pustaka dipulihkan pada peramban tanpa `Map.groupBy` bawaan. Kode bahasa Belajar dinormalisasi agar bendera terdaftar tetap melekat pada kontrol bahasa, dan persistensi audio jarak jauh dipindahkan sepenuhnya ke namespace milik komponen pada gateway Berkas. Pustaka tidak lagi menulis berkas cache secara langsung atau menetapkan batas ukurannya sendiri.

## Selaraskan dengan cabang Development upstream

Perubahan terbaru dari cabang Development upstream digabungkan. Konflik pada adaptor undangan pendaftaran yang telah dihentikan diselesaikan dengan memilih implementasi berbasis token dari upstream agar fitur Pustaka Belajar tetap kompatibel dengan arsitektur aplikasi terkini.

## Perbarui kompatibilitas adaptor Belajar

Batas versi gateway yang telah diuji untuk adaptor Pustaka dan Kemajuan dinaikkan ke versi gateway upstream, versi kedua adaptor ditingkatkan, dan catatan workspace lengkapnya dipulihkan di berkas kunci agar pemasangan dependensi bersih berhasil setelah penggabungan. Metadata integritas registri upstream juga diperbaiki agar kumpulan dependensi terkunci dapat direproduksi.

## Batasi perubahan pada Pustaka

Perubahan yang tidak terkait pada inti, API, router, adaptor, gateway, dan fitur telah dihapus sehingga pull request ini hanya memuat Pustaka Belajar, integrasi Belajarnya, dan perangkat UI pakai ulang yang diperlukan komponen tersebut.

## Rutekan subhalaman Study berkelompok

Kapabilitas UI generik ditambahkan untuk penemuan, penyimpanan tembolok, invalidasi, dan resolusi rute subhalaman berkelompok. Study kini memakai satu model berbasis penyedia untuk daftar halaman setiap bahasa, submenu bahasa terpilih, kartu hub, dan pemuatan halaman anak, sementara navigasi mempertahankan bahasa terpilih dalam status riwayat privat.

## Pulihkan polesan interaksi Pustaka

Penciutan tajuk saat menggulir kini stabil, navigasi lapisan Study terisi sejak pemuatan pertama, luapan tombol bahasa dihapus, dan judul popup ringkas dipulihkan. Pustaka administrator kini membuka detail baris hanya-baca dengan ringkasan referensi sederhana serta multi-pilih melalui klik kanan. Kartu pelajar kembali menampilkan pratinjau pelafalan dan definisi, mempertahankan tautan dalam, dan menghindari bagian detail ganda. Status lapisan aktif, tanda pilihan terpusat, dan kontrol sunting yang mengikuti tema kini tetap konsisten secara visual.

## Penyuntingan Library milik penyedia

Baris Library kini membuka detail hanya-baca melalui seluruh area klik, sedangkan tindakan edit yang mengikuti tema tetap berada di ujung baris. Skema penyedia menentukan label bidang, kontrol, klasifikasi yang tidak dapat diubah, relasi tautan mendalam, dan penelusuran audio sesuai bahasa. Tag disimpan dengan Enter, opsi terpilih dapat dibatalkan, bidang wajib divalidasi sebelum pengiriman, dan tindakan mengambang memiliki label terlokalisasi. Kartu serta subnavigasi Study menggunakan keadaan hover stabil yang sadar tema, sementara komposisi memilih catatan tingkat terdekat sebelum karakter atomik.

## Memoles pratinjau Library dan pemeriksaan administrator

Kartu pelajar disederhanakan menjadi label dan pelafalan satu baris yang rapi dengan indikator cakupan terpisah; definisi serta metadata dihapus dari pratinjau. Klik baris administrator kini membuka formulir berbasis skema yang sama dengan penyuntingan dalam mode nonaktif dan hanya-baca, bukan popup detail pelajar.

## Memperjelas kartu ringkas dan tautan kosakata

Permukaan kartu pelajar digelapkan, sudut ringkas yang tidak menghalangi disediakan untuk petunjuk varian, dan lapisan hover relasi yang berulang dihapus. Label relasi kosakata kini menyertakan pelafalan dari penyedia agar kata satu karakter yang bermakna tetap dapat dibedakan dari rekaman unit tulisannya.

## Menjaga cabang varian bertingkat tetap terlihat

Kisi Library mempertahankan batas pemotongannya. Cabang terbuka kini menguji arah pilihan penyedia dan arah cadangan terhadap batas yang dirender agar kartu bertingkat tetap di dalam kisi kartu. Petunjuk tekan lama tidak lagi dianimasikan atau menjadi kabur dan teksnya 25% lebih besar.

## Membatasi penempatan varian pilihan penyedia

Luapan diganti dengan penempatan runtime berbatas. Arah penyedia tetap menjadi pilihan pertama, tetapi setiap cabang bertingkat yang terlihat diukur dan diarahkan ulang bila perlu agar semua kartu tetap di dalam kisi Library dan widget.

## Pertahankan jangkar kartu bertingkat

Penyesuaian kini hanya mengukur kartu yang sedang ditempatkan sehingga turunan tidak dapat memindahkan induk yang sudah diposisikan. Jika jalur yang dipangkas tidak menyediakan cukup slot di sekelilingnya, kartu saudara menggunakan ulang arah dengan jarak yang bertambah dan ditumpuk pada baris atau kolom yang sama.

## Hapus detail judul kosakata yang berulang

Popup kosakata kini menggunakan judul utama hanya untuk label unit leksikal dan menampilkan definisi yang dilokalkan bagi bahasa aktif pada detail judul. Ejaan alternatif, pelafalan, dan keterangan induk varian tidak lagi menduplikasi judul kosakata.

## Warisi definisi kosakata kontekstual

Membuka kosakata melalui kartu entri terkait kini membawa definisi terlokalkan kartu sumber sebagai nilai cadangan. Definisi milik catatan kosakata tetap menjadi sumber utama, sedangkan navigasi popup lain menghapus nilai cadangan agar makna tidak bocor antarjalur penelusuran.

## Tampilkan beberapa definisi berurutan

Kartu kini mempertahankan urutan definisi penyedia: definisi terlokalkan pertama ditampilkan di samping judul kecuali menduplikasi judul, sedangkan definisi sisanya hanya ditampilkan dalam bagian Definisi Tambahan jika tersedia. Nilai cadangan dari kartu sumber hanya digunakan jika kosakata tidak menyediakan definisi.

## Pertahankan kartu anak saudara pada slot berbeda

Penyesuaian varian saat jalan kini melacak kartu akar dan setiap anak terlihat yang sudah ditempatkan sebagai persegi panjang terisi. Posisi pilihan penyedia yang masih kosong dan berada dalam batas dipertahankan; jika tidak, alternatif dalam batas dengan tumpang tindih paling kecil dipilih agar kartu saudara tidak lagi jatuh ke slot yang sama.

## Keandalan dan Isolasi

Aset paket memakai study_library_asset_chunks dengan identitas SHA-256 dari penerbit, paket, versi, dan jalur aset lengkap serta posisi bilangan bulat. URL publik dan byte asli tetap dipertahankan. Indeks paket membatasi penghapusan. Skema tetap memakai identitas skema/versinya dengan fragmen utama dan study_library_schema_parts. Kedua muatan memakai fragmen aman Unicode paling besar 60.000 byte UTF-8. Pembacaan menyusun fragmen berurutan; impor menggantinya dalam transaksi yang sudah ada. Konflik versi, penggantian oleh penerbit tunggal, pembatalan transaksi, dan penggantian lebih pendek tetap berlaku.

Perubahan JSON Library menerima paling besar 5 MiB dan menolak aliran lebih besar dengan HTTP 413 sebelum menjalankan perubahan. JSON bidang kartu serta bentuk pencarian ternormalisasinya masing-masing dibatasi 50.000 byte UTF-8 agar tersedia ruang bagi judul dan tag. Lampiran audio harus memakai jalur unggahan yang tepat; lintasan keluar direktori dan jalur bersarang ditolak sebelum mengakses penyimpanan. Pembuatan dan penyuntingan kartu berbagi penulis referensi kanonis untuk kelompok, posisi, dan transformasi pilihan. Kegagalan memuat lokasi ditampilkan sebagai notifikasi terlokalisasi; jawaban dari tampilan yang dibatalkan tidak mengubah kontrol tampilan aktif.

Snapshot imbalan mempertahankan pemeriksaan revisi peserta dan memakai fragmen utama beserta engagement_participant_parts. Commit memeriksa serta menaikkan revisi dan mengganti semua fragmen dalam satu transaksi. Pembacaan menggabungkan data utama dan fragmen berurutan dalam satu pernyataan agar revisi dan muatan tidak berasal dari commit berbeda. Setiap fragmen paling besar 60.000 byte UTF-8. Kegagalan membatalkan revisi dan byte; penulis yang berbenturan menerima engagement_state_conflict. Pengujian menegakkan batas teks fisik, bukan menerima string tanpa batas.

Tipe bersama untuk peristiwa, pelaku, proyeksi, dan kapabilitas kemajuan berada di gateways/study/reuse/progress.ts. Gateway tidak lagi mengimpor titik masuk adaptor opsional untuk kontrak ini; adaptor tetap menerapkan kapabilitas dan ekspor publik yang sama. JSON peristiwa serta koreksi dibatasi 60.000 byte; permintaan lebih besar menghasilkan 413 sebelum pencatatan. Privasi, pemeriksaan kelas, koreksi, imbalan, dan alur pembangunan ulang tetap aktif.

Permintaan definisi dan peringkat tanpa autentikasi menjalankan pemeriksaan autentikasi yang diinjeksi dan selesai dengan HTTP 401 sebelum membaca data. Parameter rute memakai kontrak HTTP bertipe dan otorisasi yang sudah ada.

Permintaan penilaian menerima paling besar 16 KiB JSON; penulisan dek menerima paling besar 5 MiB. Permintaan lebih besar menghasilkan HTTP 413 tanpa mengubah dek atau jadwal. Membaca, menulis, antrean ulang, catatan impor, dan kartu berbasis Library tetap berperilaku sama.

PUT brankas memakai pembaca aliran JSON bersama milik API dengan anggaran brankas efektif dan tambahan 1 KiB untuk amplop. Kebijakan, galat 413, dan validasi data terserialisasi tetap dimiliki adaptor; tidak ada implementasi penyanggaan kedua.

Halaman Study berbagi satu slot subnavigasi composer, memakai label navigasi dan tindakan bersama dari ui.reuse dalam keempat bahasa, serta menentukan rute aktif saat dirender. Lingkup router yang dibatalkan tetap dibatalkan ketika diganti. Kegagalan pratinjau gambar menampilkan notifikasi galat terlokalisasi dan membuka kunci status agar dapat dicoba lagi.

## Dokumen Dek Terbatas

Keanggotaan dek, catatan impor, dan jadwal pelajar menggunakan fragmen aman Unicode hingga 60.000 byte UTF-8. Satu kueri gabungan menyusun kembali setiap dokumen yang telah dikomit; penggantian dan penghapusan berada dalam transaksi dek. Upsert baris pelajar menyerialkan ulasan dan pengeditan dek sebelum pembacaan snapshot, termasuk pada isolasi repeatable read. Tanda terima percobaan dikomit bersama jadwal, sedangkan pengiriman Progress tetap di luar transaksi tersebut. Kartu dan skema dalam respons serta ekspor merujuk ID Library terkini; penyimpanan tidak menggandakan isi kartu Library.

## Aksi Peramban yang Diperluas

Penyedia Library menerbitkan `study:library:client` melalui ctx yang dibatasi siklus hidupnya. Setiap operasi klien gateway menjalankan `study:library:<clientFunction>` melalui `before`, `execute`, dan `after`. Misalnya, perluas `study:library:createLibraryEntry` pada `before` untuk memeriksa atau mengubah `input.args` (argumen posisi fungsi klien), atau lempar galat untuk menolak sebelum permintaan. Tahap `after` menerima `data.result` dan dapat menyesuaikan nilai hasil. Otorisasi dan validasi server tetap berlaku. Pembacaan, resolusi kamus, impor, permintaan publikasi, dan perubahan media menggunakan batas yang sama. Pelepasan penyedia membatalkan permintaan aktif serta menghapus kapabilitas, alur, dan hook; pemanggilan lama ditolak. Pengaktifan ulang mendaftarkan aksi baru.

## Dekode Notifikasi Sekali

Notifikasi permintaan mendekode entitas XML dalam satu lintasan dan menyisipkan nilai akun serta permintaan sekali sebagai data literal. Teks entitas yang dikodekan tetap dikodekan pada tingkat berikutnya. Teks bahasa pilihan yang kosong atau tidak tersedia menggunakan nilai bahasa Inggris; nilai bahasa Inggris yang tidak tersedia menghasilkan galat eksplisit. Empat katalog sumber daya disimpan dalam cache selama masa hidup pemberi notifikasi, dan pembacaan yang gagal dapat dicoba kembali.

## Patuhi Autentikasi Study

Study memerlukan gateway Authentication dan kapabilitas `auth:routeContext` sebelum mendaftarkan rute. Administrasi adaptor, penemuan bahasa, dan rute menggambar menggunakan konteks yang disuntikkan, termasuk pemeriksaan akses khusus. Kontrak autentikasi yang tidak tersedia menggagalkan bootstrap alih-alih memilih pemeriksaan bawaan.

## Pemilihan Latihan Merata

Panduan menggambar dan pengacakan jawaban kartu belajar menggunakan pembantu `randomIndex` yang sama. Pembantu ini menggunakan Web Crypto dengan pengambilan sampel penolakan bermasker untuk rentang bilangan bulat dari 1 hingga 2^32 tanpa bias modulo. Rentang dengan satu posisi tidak membutuhkan entropi. Pemanggil dapat menyuntikkan sumber entropi untuk pengujian deterministik; latihan biasa selalu menggunakan Web Crypto.

## Konfigurasi Uji Tetap Data

Pengujian penemuan Study menyalin modul adaptor statis dan menyimpan identitas serta dependensi yang dapat dikonfigurasi dalam JSON. Pengujian tidak membangun sumber yang dapat dieksekusi dari nilai terserialisasi. Penyiapan bersama mempertahankan perilaku penemuan dan bootstrap sebenarnya. Pengujian gambar marketplace membandingkan asal dan jalur URL terurai secara tepat, termasuk permintaan GitHub privat.

## Pilih Bentuk dalam Kalimat

Pemilihan berulang kata kerja, kata keterangan, dan entri yang mendukung bentuk jamak membuka pemilih transformasi sebelum ditambahkan ke kalimat. Pembatalan mempertahankan susunan kalimat. Riwayat gantungan kunci dibatasi tanpa menghapus rahasia, brankas yang ada tetap dapat dibaca dalam batas mutlak untuk diringkas, dan kegagalan sinkronisasi latar belakang ditampilkan.

## Commit

- [2db6fd1a](https://github.com/Cognis-Labs-HQ/Cognis/commit/2db6fd1a147194de35f45b07090d0b5356206933)
- [45c1c7e0](https://github.com/Cognis-Labs-HQ/Cognis/commit/45c1c7e011bfde255e69e0dcf87b01e95600c49a)
- [2b1ff9e2](https://github.com/Cognis-Labs-HQ/Cognis/commit/2b1ff9e205cab5fb1645370b367efa76f1e9b199)
- [8a0ef5f9](https://github.com/Cognis-Labs-HQ/Cognis/commit/8a0ef5f9)
- [8d2b4358](https://github.com/Cognis-Labs-HQ/Cognis/commit/8d2b4358c176a447bb60e9248f40c1234f8cb143)
- [e4f406f1](https://github.com/Cognis-Labs-HQ/Cognis/commit/e4f406f16a3f0635a6f25206d19d19706cedbbbc)
- [a7891aaa](https://github.com/Cognis-Labs-HQ/Cognis/commit/a7891aaa8195180c45fa490ada5469d2d306c62b)
- [b8a1852e](https://github.com/Cognis-Labs-HQ/Cognis/commit/b8a1852e1f4aa45ce950ad49484f818c713341d2)
- [820d53f6](https://github.com/Cognis-Labs-HQ/Cognis/commit/820d53f65816655949a0a1f47068a10cdfc51178)
- [8be331f9](https://github.com/Cognis-Labs-HQ/Cognis/commit/8be331f9bc1a54edc80c10e53a4e4d2704a4f7b5)
- [3c72e487](https://github.com/Cognis-Labs-HQ/Cognis/commit/3c72e4870f99213562fb3796b4d76624486ba272)
- [25309509](https://github.com/Cognis-Labs-HQ/Cognis/commit/25309509877018b8d1a4633636f9d45daeef45b4)
- [de20ea2c0](https://github.com/Cognis-Labs-HQ/Cognis/commit/de20ea2c0)
- [92ef5510](https://github.com/Cognis-Labs-HQ/Cognis/commit/92ef5510)
- [b38f8b31](https://github.com/Cognis-Labs-HQ/Cognis/commit/b38f8b31)
- [f9ce159d](https://github.com/Cognis-Labs-HQ/Cognis/commit/f9ce159da8ad07c2ff59f913eebab32a69f26921)
- [03dd55f0](https://github.com/Cognis-Labs-HQ/Cognis/commit/03dd55f02c762ae99dc3870322ceb9864cb9e325)
- [e8019a21](https://github.com/Cognis-Labs-HQ/Cognis/commit/e8019a21e12295863fcf009a52385c85069498de)
- [806058fe](https://github.com/Cognis-Labs-HQ/Cognis/commit/806058fe26c0d127f0bacf034530b1023131d380)
- [3c0d5766](https://github.com/Cognis-Labs-HQ/Cognis/commit/3c0d57662df962ac6b5d93f793e0c8de91e1856b)
- [748063b1](https://github.com/Cognis-Labs-HQ/Cognis/commit/748063b10cc208747832e7880098858db648a415)
- [e96d273f](https://github.com/Cognis-Labs-HQ/Cognis/commit/e96d273fa56edd2c2ded09ca993724437ab85c93)
- [66867a1d](https://github.com/Cognis-Labs-HQ/Cognis/commit/66867a1d08a247fa73824aeba982ccba1f9b5d8c)
- [c113e7a1](https://github.com/Cognis-Labs-HQ/Cognis/commit/c113e7a1f5cb7bc2a86c39b8f419ae6b953de9e3)
- [af8bb812](https://github.com/Cognis-Labs-HQ/Cognis/commit/af8bb812d7c31626d877114ce657ca664bf4fe9f)
- [f9740de0](https://github.com/Cognis-Labs-HQ/Cognis/commit/f9740de0c23433da63e296677b64f21540da44db)
- [f90334ce](https://github.com/Cognis-Labs-HQ/Cognis/commit/f90334ced0dc442d6e0c1627704cd36984128910)
- [52002ada](https://github.com/Cognis-Labs-HQ/Cognis/commit/52002ada74f6d3a6e80ee796e2348128434b524c)
