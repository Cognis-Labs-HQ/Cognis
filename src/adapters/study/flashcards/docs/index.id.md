# Adaptor Kartu Belajar

## Dokumen Dek Terbatas

Keanggotaan dek, catatan impor, dan jadwal pelajar menggunakan fragmen aman Unicode hingga 60.000 byte UTF-8. Satu kueri gabungan menyusun kembali setiap dokumen yang telah dikomit; penggantian dan penghapusan berada dalam transaksi dek. Upsert baris pelajar menyerialkan ulasan dan pengeditan dek sebelum pembacaan snapshot, termasuk pada isolasi repeatable read. Tanda terima percobaan dikomit bersama jadwal, sedangkan pengiriman Progress tetap di luar transaksi tersebut. Kartu dan skema dalam respons serta ekspor merujuk ID Library terkini; penyimpanan tidak menggandakan isi kartu Library.

Permintaan penilaian menerima paling besar 16 KiB JSON; penulisan dek menerima paling besar 5 MiB. Permintaan lebih besar menghasilkan HTTP 413 tanpa mengubah dek atau jadwal. Membaca, menulis, antrean ulang, catatan impor, dan kartu berbasis Library tetap berperilaku sama.

Latihan menggunakan pertanyaan dan satu tampilan tinjauan jawaban, tanpa membalik sisi depan dan belakang. Jawaban salah, kartu yang telah dijawab, dan Tampilkan Jawaban tetap menyediakan tinjauan lengkap berbasis Library serta penilaian Ulang. Dek yang hanya berisi kalimat menggunakan Membaca dan menyembunyikan pilihan mode mengambang tanpa menimpa preferensi tersimpan untuk dek yang dapat ditulis. Dek campuran mempertahankan mode pilihan. Kalimat dan jawaban panjang dapat melebar hingga 72rem sesuai lebar halaman. Tag bahasa tidak valid menghasilkan invalid_language dengan HTTP 400.

Latihan membaca menampilkan pelafalan utama di samping nilai kartu jika berbeda; teks setara setelah normalisasi tidak diulang. Petunjuk tanda tanya berbentuk lingkaran menyorot dan memfokuskan jawaban benar saat ini, termasuk setelah pilihan diacak. Penggunaan petunjuk mencatat Ulang melalui alur ulasan yang ada, dan pilihan benar berikutnya tetap dianggap dibantu. Jawaban benar tanpa bantuan tetap mendapat nilai Baik. Latihan menulis mempertahankan kontrol panduannya sendiri.

Coba Lagi hanya ditampilkan jika antrean terbaru untuk fokus yang dipilih berisi kartu. Fokus kosong tetap menampilkan ucapan selamat dan tindakan Beranda tanpa menawarkan pengulangan kosong.

Setelah dek selesai, tanda centang hijau dan ucapan selamat ditampilkan di tengah. Beranda kembali ke Semua. Coba Lagi membangun ulang antrean berdasarkan status ulasan terbaru dan memulainya dari kartu pertama, mempertahankan fokus Total/Selesai/Jatuh Tempo/Baru meskipun ulasan tersimpan telah mengubah status kartu. Hanya jawaban sesi dan identitas percobaan yang direset; kemajuan ulasan tersimpan tetap utuh. Latihan melalui tautan berbagi menggunakan tampilan selesai yang sama dan memulai ulang sesi sementara.

## Penggunaan

Buka dek yang terlihat dari Flashcards untuk langsung berlatih. Pilih Total, Selesai, Jatuh Tempo atau Baru untuk menentukan kartu.

## Spesifikasi Teknis

Dek menggunakan jenis sumber daya `studyDeck` dan kemampuan baca `study:flashcards:read`. Kontrol Berbagi Cognis mendukung pengguna, tautan publik, masa berlaku, kata sandi, dan pencabutan. Hanya pemilik dapat mengubah atau menghapus dek. Penerima dapat belajar dengan jadwal terpisah per akun; ekspor hanya untuk pembuat atau administrator. Tamu tautan belajar sementara tanpa mengubah jadwal akun. Masa berlaku dan pencabutan diperiksa pada setiap operasi dek.

Berbagi memberikan akses terbatas pada dek ke kartu dan definisi Pustaka terkini, tanpa akses umum ke Pustaka atau perubahan cakupan kartu. Setelah izin berbagi diperiksa, ID diambil dengan hak pemilik. Kartu yang tidak tersedia atau berasal dari penyedia nonaktif dilewati. Metadata galeri dan respons penilaian tidak menampilkan salinan kartu tersimpan. Penghapusan dek mencabut berbagi serta menghapus jadwal dan bukti penerimaan jawaban.

Impor dan ekspor memakai teks UTF-8 dengan kolom berpetik yang dipisahkan tab: Front, Back, dan Pronunciation opsional. Ekspor menyertakan kepala Anki untuk pemisah, dek, dan teks biasa serta konteks Cognis opsional yang dapat diabaikan Anki. Kutipan, tab, dan baris baru dipertahankan. Format ini adalah TSV, bukan arsip `.apkg`. Riwayat belajar pribadi tidak diekspor.

## Penelusuran dan Favorit Study

Flashcards membuka daftar dek milik sendiri, dek yang dibagikan kepada akun, dan dek awal lengkap dari penyedia bahasa aktif. Tautan berbagi tetap memerlukan izin yang berlaku dan bukan direktori publik. Menu + di kanan atas menawarkan Buat Dek dan Impor Dek. Jelajahi, Library, dan Flashcards menggunakan favorit Study tersimpan per akun dan kontrol urutan bersama. Pilih urutan penyedia, A–Z, Z–A, terbaru atau terlama. Bintang menjadi emas saat menyaring hasil favorit. Item Library, dek, dan kartu belajar memiliki favorit terpisah. Favorit tidak memberikan hak akses. Papan gambar mengakhiri sesi saat rute berubah dan tidak menimpa kelas composer atau shell.

## Dek Awal dari Penyedia

Deskriptor bahasa dapat menetapkan `starterDecks` berupa `{ key, name, schemaId, sourceRecordIds }`. Kunci stabil dalam paket, nama dipetakan per bahasa, dan hingga 500 kunci rekaman unik menentukan urutan belajar. Cognis menyelesaikan rekaman Library global menjadi ID Library kanonis. ID dek tetap stabil lintas revisi. Dek tidak lengkap dan penyedia nonaktif disembunyikan. Dek awal hanya-baca; jadwal dan favorit tetap pribadi. Detail kartu baru dimuat ketika dek dibuka.

Flashcards memuat stylesheet bersama page-builder dan page-sections seperti Explore dan Requests. Setiap pemasangan memiliki cakupan interaksi yang dapat dibatalkan agar handler jelajah atau belajar lama tidak tetap aktif setelah navigasi. Gaya adapter tidak menimpa kelas composer, shell, atau tombol bersama; pemeriksaan regresi memastikan batas ini dan dependensi stylesheet.

Pembuatan dan impor dek yang berhasil menutup editor terlindungi sebelum membuka halaman jelajah yang diperbarui, sehingga perubahan tersimpan tidak memicu dialog pembuangan. Hasil Library khusus favorit menampilkan kartu anak terpilih secara mandiri; urutan penyedia memulihkan penempatan bersarang asli.

## Kontrol Belajar Tersimpan

Mode Reading/Writing disimpan sebagai preferensi akun dalam menu mengambang composer; defaultnya Reading. Perubahan saat latihan meminta konfirmasi melalui popup peringatan bersama sebelum mengulang antrean. Pembatalan mempertahankan posisi dan jawaban; ulasan yang telah dikirim tetap tersimpan. Bilah samping mencakup Semua dan menandai dek aktif. Judul papan bersama menyamarkan karakter hingga sengaja diungkap. Aktivasi kedua meminta konfirmasi navigasi di luar Explore; di dalam Explore kartu langsung dibuka. Aktivasi papan ketik mengikuti interaksi yang sama.

Kartu kosakata baru otomatis mendeteksi kelas dan tag transformasi yang didukung melalui kamus saat input diselesaikan dan sebelum disimpan. Tag manual dipertahankan; kelas ambigu tetap memerlukan pilihan pengguna. Hasil yang terlambat tidak mengubah draf lain. Pratinjau bentuk verba, adjektiva/adverbia, dan jamak meminta audio transformasi yang dipilih. Atribusi sumber pada judul menautkan kartu dasar. Kontrol unggahan memakai selektor terpisah dari audio pemutar untuk mencegah kegagalan inisialisasi editor karakter.

Menu samping dek bergulir bersama dokumen. Menampilkan navigasi utama tidak mengubah ukuran area gulir samping terpisah atau menggeser kartu.

## Mode Latihan Terlihat dan Kontrol Bertema

Pemilih Baca/Tulis persisten kini menampilkan slot mengambangnya di halaman Flashcards. Perubahan mode tetap menyimpan preferensi dan meminta konfirmasi untuk memulai ulang sesi. Ikon ekspor dan pengaturan Study mengikuti warna kontrol aktif, tema terang/gelap aplikasi, dan keadaan hover tanpa bergantung pada tema sistem operasi.

Jawaban dapat menyertakan objek `attempt` dengan `id` dan waktu ISO `occurredAt`. Kirim ulang objek dan nilai yang sama untuk mencoba lagi; jawaban baru memakai ID baru. Bukti penerimaan dan jadwal disimpan bersama, sedangkan ID peristiwa stabil mencegah duplikasi Kemajuan. Riwayat peramban mempertahankan percobaan tertunda tanpa data dalam URL. Kartu latihan menyatakan ketergantungan pada Pustaka dan Kemajuan. Kartu bersama beserta skemanya memuat data Pustaka terkini setelah otorisasi berbagi.

## Imbalan Latihan Tersimpan

Jadwal kartu belajar dan bukti percobaan disimpan sebelum pengiriman imbalan lintas adapter. Alur terpisah `study:decks:recordResult` mengirim ulang hasil yang sama setelah kegagalan tanpa memajukan jadwal lagi. Ini menghindari transaksi basis data bersarang ketika Progress menyimpan peristiwa.

Pilihan jawaban kartu belajar berupa tombol jawaban tersendiri. Judul kartu dan jawaban yang diungkap menggunakan tindakan dalam aplikasi dengan konfirmasi keluar dan urutan dek yang tetap terjaga, tanpa menampilkan URL kartu saat diarahkan penunjuk. Di Explore, klik kedua pada judul gambar yang telah diungkap membuka kartu langsung melalui tindakan tanpa URL.

Latihan menulis hanya menggunakan judul tersamarkan pada papan gambar. Panah SVG sebelumnya/berikutnya berada di atas papan bersama kontrol favorit; berikutnya tetap memerlukan jawaban. Flashcards meneruskan `suppressRetry: true` ke papan bersama untuk menyembunyikan dan menonaktifkan percobaan ulang; latihan mandiri tetap mengizinkannya secara bawaan.

Pengguna papan tertanam dapat menyediakan `onNavigate(card)` setelah konfirmasi judul bersama. Flashcards menggunakannya untuk mencatat percobaan saat ini melalui alur keluar dan mempertahankan konteks navigasi dek sebelum membuka Explore.

Titik masuk peramban utama adalah `ui/app/index.js`; modul tindakan, tampilan, bahasa, dan latihan berada di sebelahnya. Dek bersama memakai `ui/app/shared-deck.js`. Perilaku dek di server memakai `service/index.ts` bersama modul rute, alur, penyimpanan, dan hasil dalam direktori layanan yang sama.

## Pemilihan Latihan Merata

Panduan menggambar dan pengacakan jawaban kartu belajar menggunakan pembantu `randomIndex` yang sama. Pembantu ini menggunakan Web Crypto dengan pengambilan sampel penolakan bermasker untuk rentang bilangan bulat dari 1 hingga 2^32 tanpa bias modulo. Rentang dengan satu posisi tidak membutuhkan entropi. Pemanggil dapat menyuntikkan sumber entropi untuk pengujian deterministik; latihan biasa selalu menggunakan Web Crypto.

Mode membaca memakai normalisasi isi jawaban yang sama untuk pemilihan pengecoh, petunjuk, dan penilaian. Tanda baca akhir kalimat, kapitalisasi, bentuk Unicode yang kompatibel, dan spasi berulang tidak membedakan jawaban. Tanda baca internal, angka, aksen, dan kata yang berbeda tetap bermakna. Makna setara tidak menjadi pilihan yang saling bersaing; kuis memakai dua hingga empat pilihan berbeda bila tersedia. Jawaban setara yang benar menerima nilai keberhasilan biasa sebelum progres dikirim.

Menu samping dek bergulir sendiri dalam tinggi halaman yang terlihat. Daftar dek panjang tidak memperpanjang halaman atau mendorong latihan ke bawah layar.

Membuka dek lain langsung menampilkan kontennya; kembali dari Explore mempertahankan posisi latihan tersimpan.

## Halaman Study luring kosong

Halaman Study yang sudah disiapkan tetap dapat dibuka dalam sesi luring terverifikasi dengan persetujuan wajib meskipun snapshot konten privat belum ada. Metadata bahasa atau preferensi yang hilang menghasilkan navigasi kosong. Explore memasang tampilan kosong normal dan menampilkan “Tidak ada konten luring tersimpan yang tersedia” alih-alih kesalahan rute atau toast kesalahan. Flashcards juga mempertahankan halaman kosong jika data dek atau sumber tampilan wajib belum tersedia. Pemberitahuan terikat halaman saat ini dan tidak diduplikasi. Kekurangan cache tidak menyembunyikan penolakan akses atau persetujuan. Library dan Flashcards menyiapkan terjemahan publik serta templat ringan saat daring; data privat tetap berada dalam cache tab yang dibatasi.
