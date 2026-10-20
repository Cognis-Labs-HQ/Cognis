# Kontrol dan Akses Belajar

**Cabang Fitur:** feature-update-external-package-contract-definitions

## Latihan Kartu

Mode Membaca atau Menulis dipilih melalui preferensi tersimpan dalam menu mengambang untuk dek akun maupun dek bersama. Mode tetap terkunci selama sesi, termasuk setelah mengunjungi Jelajahi dan kembali melalui tombol Kembali browser; pergantian mode memerlukan konfirmasi sebelum mereset kemajuan. Kartu yang tidak mendukung mode dapat dilewati tanpa pergantian mode otomatis. Jawaban kartu baru mula-mula disembunyikan. Semua, Baru, Jatuh Tempo, dan Selesai mempertahankan filter ulasan; mengganti filter memulai antrean baru dalam mode yang sama.

Membaca memakai pelafalan utama dan tiga pengecoh berbeda dari kartu Library yang terlihat. Menulis menanamkan pad bersama dengan petunjuk arti dan bacaan, sedangkan karakter disembunyikan di balik judul yang dapat diklik. Kesalahan goresan tidak otomatis membuka karakter. Membuka karakter dianggap sebagai bantuan dan memberi hasil Ulangi, meskipun goresan berikutnya benar. Keberhasilan tanpa bantuan memberi hasil Baik. Jawaban kartu yang sudah diulas tetap dapat diperiksa.

Galeri memakai `/study/<iso>/flashcards`; tautan dek memakai nama yang mudah dibaca diikuti `--<deck-id>`, misalnya `/study/ja/flashcards/first-japanese-words--<deck-id>`. Nama Inggris kanonis menjaga bagian terbaca tetap sama di semua bahasa antarmuka. Akhiran identitas membedakan nama duplikat dan menjaga tautan tetap konsisten bagi pemilik serta penerima dengan katalog dek berbeda. ID sumber daya API tetap sama.

Entri riwayat browser menyimpan antrean dek, posisi, nilai, jawaban tertunda, filter, serta mode. Kembali dari Jelajahi memulihkan antrean asli dengan tombol Sebelumnya/Berikutnya yang berfungsi. Membuka jawaban atau meninggalkan kartu yang belum dijawab untuk diperiksa menyimpan hasil Ulangi. Tautan sumber membawa urutan ID kartu melalui status riwayat agar pratinjau Jelajahi juga dapat menavigasi dek, termasuk kartu turunan. Akses tetap mengikuti otorisasi Library; kartu yang tidak lagi dapat diakses dikeluarkan saat pemulihan.

Semua tindakan menjalankan alur dek dan menggambar Study yang sudah dideklarasikan. Antarmuka memakai popup, tombol, dan gaya kartu yang sudah ada. Dek akun dan bersama memakai perender serta latihan yang sama; snapshot bersama tidak memperoleh akses Library. Perpindahan halaman menghentikan penangan dan sesi menggambar.

## Umpan Balik dan Tautan

Jawaban Reading menampilkan toast keberhasilan atau peringatan dan animasi pada opsi yang dipilih; preferensi pengurangan gerakan menonaktifkan animasi. Judul kartu dan bintang favorit memiliki latar transparan dengan indikator fokus papan ketik. Menu samping standar mencantumkan judul dek bahasa saat ini dan menandai dek aktif.

Tautan kartu Explore menyertakan identitas kanonis kartu pada `/study/explore/<language>/<layer>/<card-id>`. Ctrl-klik, Command-klik, dan Shift-klik mempertahankan perilaku bawaan peramban; kunjungan langsung membuka pratinjau kartu yang diminta. Membuka kartu yang belum dijawab dihitung sebagai percobaan dengan bantuan. Navigasi biasa mempertahankan antrean dek untuk tombol Kembali peramban.

## Kontrol Belajar Tersimpan

Mode Reading/Writing disimpan sebagai preferensi akun dalam menu mengambang composer; defaultnya Reading. Perubahan saat latihan meminta konfirmasi melalui popup peringatan bersama sebelum mengulang antrean. Pembatalan mempertahankan posisi dan jawaban; ulasan yang telah dikirim tetap tersimpan. Bilah samping mencakup Semua dan menandai dek aktif. Judul menulis memburamkan glif pengganti berukuran sama. Klik pertama menampilkan karakter dan mengaktifkan tautan Explore; klik kedua meminta konfirmasi navigasi. Aktivasi papan ketik mengikuti interaksi yang sama.

Kartu kosakata baru otomatis mendeteksi kelas dan tag transformasi yang didukung melalui kamus saat input diselesaikan dan sebelum disimpan. Tag manual dipertahankan; kelas ambigu tetap memerlukan pilihan pengguna. Hasil yang terlambat tidak mengubah draf lain. Pratinjau bentuk verba, adjektiva/adverbia, dan jamak meminta audio transformasi yang dipilih. Atribusi sumber pada judul menautkan kartu dasar. Kontrol unggahan memakai selektor terpisah dari audio pemutar untuk mencegah kegagalan inisialisasi editor karakter.

Pilihan kamus menggunakan theme-select dan disembunyikan jika hanya ada satu penyedia. Pengaturan berada di kanan input pencarian kamus. KANJIDIC2 memperkaya data kanji dan bukan pilihan pencarian sejajar dengan Jisho; sumber referensi menggunakan nama katalog sebenarnya.

Rekaman kata Jepang dengan kana kecil, termasuk 学校, dibuat ulang dengan ejaan kanji jika tersedia menggunakan suara Jepang yang ditetapkan dan pengaturan stabil. Kalimat bawaan disusun ulang dari klip yang sama persis. Transformasi adjektiva I dan Na mencakup bentuk adverbial, negatif, serta lampau, dengan rekaman khusus untuk bentuk bawaan. Rekaman jamak bahasa Inggris tetap berupa aset khusus dan diputar saat bentuk tersebut dipilih.

## Media dan Kontrol Kartu

Menambahkan kolom daftar gambar opsional, unggahan privat, dan galeri detail. Kedua modul bahasa menyertakan foto referensi berlisensi dan menyediakan kolom yang sama pada setiap lapisan. Gambar mini editor menampilkan gambar bawaan dan unggahan, menyediakan tombol hapus merah saat diarahkan atau difokuskan, serta membuang berkas sementara yang belum digunakan tanpa konfirmasi. Kartu tersimpan dan riwayat permintaan mempertahankan berkas yang dirujuk. Tombol hapus memiliki latar buram agar tetap terbaca di atas foto. Berkas gambar khusus dan referensi tersimpan bertahan setelah server dimulai ulang dan penyedia dimuat ulang, termasuk pembaruan penyedia pada kartu yang disunting. Kapabilitas global `ui:imagePreview` menyediakan tampilan gambar mini, pengikatan interaksi, dan tindakan `open` melalui alur terdaftar `ui:imagePreview:open`. Fitur ini juga tersedia melalui `ui:reuse` sebagai `image-preview.js`; lembar gayanya termasuk gaya bersama. Tombol gambar membuka gambar asli dalam ukuran alaminya, dibatasi area layar, dengan hanya tombol X standar yang terlihat. Aktivasi papan ketik, Escape, pemulihan fokus, dan penutupan saat tampilan atau penyedia dilepas memakai siklus hidup popup bersama. Pemanggil mengelola URL gambar dan tindakan penghapusan opsional. Library memakai kontrol ini untuk gambar unggahan dan bawaan dalam editor serta galeri detail.

Perekaman mikrofon menunggu jawaban izin peramban, mencegah permintaan ganda dan penyimpanan saat izin belum dijawab, serta menghentikan aliran yang diberikan setelah editor ditutup. Penolakan izin dan ketidaktersediaan perekaman memiliki pesan terpisah. Mikrofon, Putar, dan Muat Ulang berada pada satu baris dengan ukuran sama. Jamak kolektif memakai satu kotak centang untuk keluarga nomina yang cocok; pilihan yang tidak sesuai tetap tersembunyi. Nama berkas audio disembunyikan. Putar memutar unggahan sementara atau rekaman mikrofon terbaru; respons audio tersimpan yang terlambat tidak menggantikannya. Saat merekam, hanya ikon mikrofon yang berwarna merah, termasuk saat diarahkan; tombol mempertahankan gaya tema biasanya.

## Pratinjau Permintaan yang Dapat Diedit

Menggunakan pratinjau kartu biasa dan editor yang ada untuk perubahan draf oleh administrator. Persetujuan mempertahankan atribusi pengirim dan menambahkan administrator penyunting sebagai pemilik bersama. Profil pengirim dan pemberi persetujuan diberi label jelas; persetujuan, penolakan, dan penarikan memerlukan konfirmasi.

## Notifikasi dan Filter Study

Memberi tahu administrator aktif tentang permintaan masuk serta keputusan administrator lain melalui Study. Menghapus animasi navigasi, menambahkan filter teks langsung untuk halaman saat ini, dan menjaga menu samping Kartu Belajar dalam alur dokumen agar bilah gulir tidak menggeser konten. Kapabilitas notifikasi diambil saat pengiriman dan tanda terima diperiksa, termasuk daftar pengiriman kosong serta kegagalan sebagian.

## Akses dan Biaya Penelusuran

Referensi balik kartu menerapkan pemeriksaan ketersediaan bahasa dan akses yang sama dengan pembacaan langsung, serta menyertakan izin penyuntingan terkini. Penelusuran berbagi pemeriksaan izin tulis kelas hanya dalam satu respons dan tidak lagi menyalin seluruh skema untuk setiap kartu; hasil skema publik tetap berupa salinan mandiri. Impor paket konten mengindeks aset sekali dan menulis setiap rekaman bersama sekali sambil mempertahankan seluruh penempatan audio.

## Judul dan Panduan Lengkap

Tautan judul popup mempertahankan tampilan teks ringkas dan tipografi yang diwarisi meskipun gaya tombol bersama dimuat belakangan. Tombol bantuan pad gambar selalu menampilkan seluruh pola goresan bernomor, termasuk goresan yang selesai dan semua kelompok, setelah latihan dimulai atau pada karakter yang pernah diselesaikan. Latihan biasa tetap menampilkan goresan berikutnya; memulai goresan baru mengatur ulang tampilan bantuan.

## Isi Kamus Otomatis

Impor kamus menguraikan isi kartu yang belum tertaut menjadi referensi lengkap dan berurutan ke kartu karakter yang tersedia dari skema aktif dan karusel masukan yang dikonfigurasi. Kana berulang dan campuran satuan tulisan mempertahankan posisinya; tautan komposisi yang disediakan dan bacaan kamus tetap menjadi acuan. Kecocokan yang belum lengkap tetap tersedia untuk penguraian manual. Saat saran urutan lengkap tersedia untuk teks yang diketik manual, saran satu karakter yang berlebihan disembunyikan.

## Pemulihan Kapabilitas Belajar

Kemajuan, papan peringkat, penilaian dan administrasi kuota tersedia melalui komponen pemiliknya. Hasil menggambar dan kartu latihan menggunakan Kemajuan; jawaban dengan bantuan tidak dihitung sebagai benar secara mandiri. Dek bersama memuat entri Pustaka terkini berdasarkan ID, sedangkan catatan impor mempertahankan identitas kanonis tersendiri. Pilihan membaca menggunakan definisi terlokalisasi dan bacaan karakter. Elemen pelafalan menggunakan tautan karakter kanonis; pencarian kamus yang selesai disembunyikan, kartu Pustaka dapat disunting dan urutan Pustaka membedakan waktu pembuatan yang sama.

## Hasil Belajar Andal

Akses kelas dan penyebutan menggunakan kontrak penyimpanan kelas saat ini serta memeriksa ulang keanggotaan. Pemangkasan paket mempertahankan entri yang masih dirujuk secara rekursif oleh kartu pengguna atau kartu penyedia yang disunting. Pengiriman ulang jawaban mempertahankan identitas percobaan selama navigasi dan memperbarui jadwal serta Kemajuan hanya sekali. Percobaan menggambar menghindari peristiwa dan kenaikan kesulitan ganda. Peristiwa JSON kanonis memungkinkan pemulihan proyeksi yang terhenti. Penyimpanan papan peringkat pulih setelah kegagalan, memerlukan penyimpanan persisten, dan memeriksa akses kelas saat dipanggil. Dek bersama menggunakan skema dan entri Pustaka terkini. Kontrak produksi Study sesuai dengan antarmuka saat berjalan, termasuk nilai bawaan skema dan dekode audio.

## Kepemilikan UI Bersama

Study menggunakan alur milik host `ui:pageOverlay.create({ signal, bottomInset })` untuk batas panel menggambar mengambang. Batas mengikuti perubahan halaman, kepala halaman, kaki halaman, dan area pandang tanpa mengubah tata letak halaman. Menutup tampilan atau melepas penyedia membersihkan pengamat, pendengar, dan elemen. Panel tertanam tetap menggunakan wadah yang diberikan.

Judul popup mempertahankan tipografi dan tata letak responsif sebelumnya melalui `headingLayout: "annotated"`, dengan posisi detail netral `aside` dan `below`. API popup menyediakan `appendHeadingAccessory(element)` dan `setContentConcealed(boolean)`. Penyembunyian memburamkan judul dan isi, memblokir interaksi, lalu memulihkan status aksesibilitas sebelumnya. Study hanya menata kontrol miliknya sendiri. Navigasi menggunakan `ui:navbarLinks`, termasuk tautan nonaktif dengan penjelasan terlokalisasi, serta menghapus tautan dan pendaftaran pencariannya saat dilepas.

## Imbalan Latihan Tersimpan

Study memuat dependensi UUID adapter dan kapabilitas inti wajib dari manifest. Dependensi diinisialisasi sebelum konsumen dan ketersediaan dihitung ulang setelah dinonaktifkan. Dependensi yang tidak tersedia membatasi Menggambar, Kartu Belajar, dan Papan Peringkat. Endpoint menggambar mengembalikan 503 jika Library atau Progress tidak tersedia. Progress menyimpan identitas proyeksi yang aman bagi basis data; latihan tepercaya menetapkan XP, pencapaian, dan peringkat berbukti secara persisten. Pengiriman imbalan kartu belajar berjalan setelah transaksi jadwal; percobaan ulang mempertahankan satu peristiwa, satu bukti imbalan, dan satu pembaruan jadwal.

Jadwal kartu belajar dan bukti percobaan disimpan sebelum pengiriman imbalan lintas adapter. Alur terpisah `study:decks:recordResult` mengirim ulang hasil yang sama setelah kegagalan tanpa memajukan jadwal lagi. Ini menghindari transaksi basis data bersarang ketika Progress menyimpan peristiwa.

Ringkasan ledger, penukaran booster, dan pembatalan aktivitas menjalankan alur ctx khusus dengan tahap validasi dan eksekusi. Identitas peserta yang tidak valid ditolak sebelum membaca atau mengubah penyimpanan.

Pratinjau kartu yang sesuai di kisi Explore diburamkan dan tidak dapat digunakan selama karakternya terbuka di papan gambar. Penempatan berulang dan yang baru dirender mengikuti keadaan yang sama; mengganti karakter, menutup papan, atau meninggalkan halaman memulihkannya tanpa mengubah ukuran kartu.

Pilihan jawaban kartu belajar berupa tombol jawaban tersendiri. Judul kartu dan jawaban yang diungkap menggunakan tindakan dalam aplikasi dengan konfirmasi keluar dan urutan dek yang tetap terjaga, tanpa menampilkan URL kartu saat diarahkan penunjuk. Di Explore, klik kedua pada judul gambar yang telah diungkap membuka kartu langsung melalui tindakan tanpa URL.

Latihan menulis hanya menggunakan judul tersamarkan pada papan gambar. Panah SVG sebelumnya/berikutnya berada di atas papan bersama kontrol favorit; berikutnya tetap memerlukan jawaban. Flashcards meneruskan `suppressRetry: true` ke papan bersama untuk menyembunyikan dan menonaktifkan percobaan ulang; latihan mandiri tetap mengizinkannya secara bawaan.

Pengguna papan tertanam dapat menyediakan `onNavigate(card)` setelah konfirmasi judul bersama. Flashcards menggunakannya untuk mencatat percobaan saat ini melalui alur keluar dan mempertahankan konteks navigasi dek sebelum membuka Explore.

Inisialisasi skema membuat tabel yang dideklarasikan serta menambahkan kolom dan indeks yang belum ada. Kunci utama atau unik yang sudah ada tidak diganti. Kontrak penyimpanan terstruktur tidak menyediakan kolom teks besar: TEXT MariaDB dibatasi 65.535 byte, dan kunci gabungan multibita tunduk pada batas ukuran kunci InnoDB. Ukuran data dan perubahan skema Study harus diperiksa terhadap batas penyedia tersebut.

Titik masuk peramban utama adalah `ui/app/index.js`; modul tindakan, tampilan, bahasa, dan latihan berada di sebelahnya. Dek bersama memakai `ui/app/shared-deck.js`. Perilaku dek di server memakai `service/index.ts` bersama modul rute, alur, penyimpanan, dan hasil dalam direktori layanan yang sama.

Saran penyusun kartu menempati baris terpisah agar masukan dan tombol Simpan Pelafalan tetap stabil. Memilih hasil kamus mengubah ejaan yang belum dikomit menjadi referensi karakter kanonis, termasuk unit tulisan tersembunyi seperti っ kecil. Komposisi yang sudah dikomit tetap dipertahankan; unit tersembunyi tidak ditampilkan dalam penelusuran.

Setelah dek selesai, tanda centang hijau dan ucapan selamat ditampilkan di tengah. Beranda kembali ke Semua. Coba Lagi membangun ulang antrean berdasarkan status ulasan terbaru dan memulainya dari kartu pertama, mempertahankan fokus Total/Selesai/Jatuh Tempo/Baru meskipun ulasan tersimpan telah mengubah status kartu. Hanya jawaban sesi dan identitas percobaan yang direset; kemajuan ulasan tersimpan tetap utuh. Latihan melalui tautan berbagi menggunakan tampilan selesai yang sama dan memulai ulang sesi sementara.

Ikon pengaturan belajar, pencarian kamus, dan cakupan kartu menggunakan masker SVG yang mengikuti warna tema aplikasi aktif. Masker pengaturan tidak lagi ditimpa gambar latar yang tidak terkait. Aset SVG tetap disajikan oleh komponen pemiliknya.

## Aktivasi Bahasa yang Andal

Bootstrap modul eksternal memiliki batas waktu bawaan dua menit agar impor paket konten tervalidasi selesai sebelum kapabilitas dipublikasikan. Pengaturan batas waktu eksplisit dari host tetap berlaku. Kegagalan dan habisnya waktu menghapus kontribusi terdaftar serta menjaga modul tetap tidak tersedia. Audio bawaan menggunakan kembali rekaman berversi yang tersimpan saat aktivasi ulang, dan membuat ulang berkas yang hilang melalui gateway Files. Rekonsiliasi catatan dan relasi pustaka tetap berjalan, termasuk untuk paket yang tidak berubah.

Coba Lagi hanya ditampilkan jika antrean terbaru untuk fokus yang dipilih berisi kartu. Fokus kosong tetap menampilkan ucapan selamat dan tindakan Beranda tanpa menawarkan pengulangan kosong.

Latihan membaca menampilkan pelafalan utama di samping nilai kartu jika berbeda; teks setara setelah normalisasi tidak diulang. Petunjuk tanda tanya berbentuk lingkaran menyorot dan memfokuskan jawaban benar saat ini, termasuk setelah pilihan diacak. Penggunaan petunjuk mencatat Ulang melalui alur ulasan yang ada, dan pilihan benar berikutnya tetap dianggap dibantu. Jawaban benar tanpa bantuan tetap mendapat nilai Baik. Latihan menulis mempertahankan kontrol panduannya sendiri.

## Keandalan dan Pembersihan

Referensi biasa mempertahankan kunci yang ada. Penempatan berkelompok menggunakan study_library_reference_groups dengan reference_id deterministik yang menyertakan kelompok dan posisi. Inisialisasi skema memindahkan baris berkelompok secara transaksional sebelum penulisan; kegagalan mempertahankan graf lama untuk percobaan ulang. Pembacaan, referensi balik, penghapusan, penyuntingan, dan pemangkasan menggunakan kedua penyimpanan relasi aktif. Pembersihan referensi impor memproses 500 ID sumber per kelompok sambil mempertahankan perubahan penyedia. Notifikasi kartu baru dikirim setelah transaksi pembuatan terluar berhasil dikomit.

Snapshot dibagi pada batas Unicode menjadi baris paling besar 60.000 byte UTF-8 dan diganti secara transaksional. Snapshot satu baris yang sudah ada menggunakan jalur baca yang sama. Metode metadata registerDefinition, assignCohort, dan setParticipation kini mengembalikan Promise<void> dan harus ditunggu. Metode menjalankan alur ctx bernama, meneruskan kegagalan penyimpanan, dan membatalkan perubahan metadata yang gagal. Pergantian musim juga mengembalikan promise yang ditunggu. Pendaftaran papan kelas secara bersamaan berbagi satu proses pendaftaran yang masih berjalan.

Batas bawaan brankas adalah 2 MiB dengan batas mutlak pemrosesan 8 MiB. Kebijakan efektif dikembalikan kepada klien. PUT menghitung byte masuk sebelum penyanggaan atau penguraian JSON dan menolak permintaan terlalu besar; GET memeriksa ukuran tersimpan sebelum penguraian. Amplop terenkripsi menggunakan baris utama serta baris lanjutan terbatas, dengan penggantian dan penghapusan atomik serta satu pembacaan gabungan. Tiap bagian tersimpan paling besar 60.000 byte UTF-8; server tetap tidak mendekripsi rahasia.

Ruang grup baru menyelesaikan pembuatan kunci dan seluruh penambahan anggota sebelum mengikat sumber integrasi. Kegagalan inisialisasi atau pengikatan menghapus ruang parsial; kegagalan pembersihan dicatat dan diteruskan. Ruang yang sudah ada dan eksklusivitas sumber tetap berperilaku sama.

Kemajuan menggambar menyimpan setiap ID percobaan yang telah dikirim bersama penghitungnya, sehingga pengiriman ulang A setelah B maupun setelah mulai ulang tidak meningkatkan kesulitan panduan lagi. Integrasi kemajuan dan imbalan tervalidasi yang sama tetap aktif.

Latihan menggunakan pertanyaan dan satu tampilan tinjauan jawaban, tanpa membalik sisi depan dan belakang. Jawaban salah, kartu yang telah dijawab, dan Tampilkan Jawaban tetap menyediakan tinjauan lengkap berbasis Library serta penilaian Ulang. Dek yang hanya berisi kalimat menggunakan Membaca dan menyembunyikan pilihan mode mengambang tanpa menimpa preferensi tersimpan untuk dek yang dapat ditulis. Dek campuran mempertahankan mode pilihan. Kalimat dan jawaban panjang dapat melebar hingga 72rem sesuai lebar halaman. Tag bahasa tidak valid menghasilkan invalid_language dengan HTTP 400.

## Komit

- [f81a683f](https://github.com/Cognis-Labs-HQ/Cognis/commit/f81a683f913c54821501fe475ba3fa317074aedd)
- [581b6928](https://github.com/Cognis-Labs-HQ/Cognis/commit/581b69283476ee95d6f7d65f4a3566332a2ec81a)
- [20d0c172](https://github.com/Cognis-Labs-HQ/Cognis/commit/20d0c172e97697a4aed295b2e25f6346d2b9edfc)
- [5a5d026f](https://github.com/Cognis-Labs-HQ/Cognis/commit/5a5d026f1e4be9b474c3e1f458d3fbe6cd5ac967)
- [b513366e](https://github.com/Cognis-Labs-HQ/Cognis/commit/b513366e7816352a0c357fddfd7b49a881341164)
- [ee448821](https://github.com/Cognis-Labs-HQ/Cognis/commit/ee44882131400a8581dff790e5b7b84a48634641)
- [7f48ca82](https://github.com/Cognis-Labs-HQ/Cognis/commit/7f48ca82ba3dee88919631ef5386697a60450937)
- [95ff5b75](https://github.com/Cognis-Labs-HQ/Cognis/commit/95ff5b7542de1a4d06df974462a917dc2388fae2)
- [e0d5ee9d](https://github.com/Cognis-Labs-HQ/Cognis/commit/e0d5ee9d097422d673f3e34185f71c9e27137e53)
- [337c806e](https://github.com/Cognis-Labs-HQ/Cognis/commit/337c806eaa01da43b3a098a641f618ee9745af43)
- [6d3f8f27](https://github.com/Cognis-Labs-HQ/Cognis/commit/6d3f8f273e8b97a0f97692a52ff3c674eb6f7892)
- [1ae7bd08](https://github.com/Cognis-Labs-HQ/Cognis/commit/1ae7bd08b99d05e23a4c7338b0bc6c680a93f28a)
- [b8edc561](https://github.com/Cognis-Labs-HQ/Cognis/commit/b8edc56133db4bc3ef13aa71ee99f8c5de7ed1f2)
- [9e019c9b](https://github.com/Cognis-Labs-HQ/Cognis/commit/9e019c9b6ffe309e9899c670995952533b9221f0)
- [f30ee3b4](https://github.com/Cognis-Labs-HQ/Cognis/commit/f30ee3b4cffbabe5a006b0ce5b6d3c49dc3838e3)
- [0fc3208a](https://github.com/Cognis-Labs-HQ/Cognis/commit/0fc3208aac734d0a3c621489d789a4a1da5c47de)
- [892b0358](https://github.com/Cognis-Labs-HQ/Cognis/commit/892b0358d506fffaef0f557adf429ff9e82d9fad)
- [d1b3b4cd](https://github.com/Cognis-Labs-HQ/Cognis/commit/d1b3b4cdce25f6db1214112c192fa9aef15ccc08)
