# Referensi Teknis

Antarmuka publik dan aturan operasional Kartu Hafalan.

## Antarmuka

study:decks menyediakan layanan dek. /api/v1/study/decks mendukung GET daftar, GET/:id, POST simpan, DELETE/:id; POST/:id/review menerima cardId, grade, dan attempt.

## Konfigurasi

Konten dan visibilitas disimpan per dek. Mode Baca/Tulis adalah preferensi akun; dek awal berasal dari penyedia terdaftar, bukan daftar bahasa tetap.

## Perilaku

### Dokumen Dek Terbatas

Keanggotaan dek, catatan impor, dan jadwal pelajar menggunakan fragmen aman Unicode hingga 60.000 byte UTF-8. Satu kueri gabungan menyusun kembali setiap dokumen yang telah dikomit; penggantian dan penghapusan berada dalam transaksi dek. Upsert baris pelajar menyerialkan ulasan dan pengeditan dek sebelum pembacaan snapshot, termasuk pada isolasi repeatable read. Tanda terima percobaan dikomit bersama jadwal, sedangkan pengiriman Progress tetap di luar transaksi tersebut. Kartu dan skema dalam respons serta ekspor merujuk ID Library terkini; penyimpanan tidak menggandakan isi kartu Library.

Permintaan penilaian menerima paling besar 16 KiB JSON; penulisan dek menerima paling besar 5 MiB. Permintaan lebih besar menghasilkan HTTP 413 tanpa mengubah dek atau jadwal. Membaca, menulis, antrean ulang, catatan impor, dan kartu berbasis Library tetap berperilaku sama.

Latihan menggunakan pertanyaan dan satu tampilan tinjauan jawaban, tanpa membalik sisi depan dan belakang. Jawaban salah, kartu yang telah dijawab, dan Tampilkan Jawaban tetap menyediakan tinjauan lengkap berbasis Library serta penilaian Ulang. Dek yang hanya berisi kalimat menggunakan Membaca dan menyembunyikan pilihan mode mengambang tanpa menimpa preferensi tersimpan untuk dek yang dapat ditulis. Dek campuran mempertahankan mode pilihan. Kalimat dan jawaban panjang dapat melebar hingga 72rem sesuai lebar halaman. Tag bahasa tidak valid menghasilkan invalid_language dengan HTTP 400.

Latihan membaca menampilkan pelafalan utama di samping nilai kartu jika berbeda; teks setara setelah normalisasi tidak diulang. Petunjuk tanda tanya berbentuk lingkaran menyorot dan memfokuskan jawaban benar saat ini, termasuk setelah pilihan diacak. Penggunaan petunjuk mencatat Ulang melalui alur ulasan yang ada, dan pilihan benar berikutnya tetap dianggap dibantu. Jawaban benar tanpa bantuan tetap mendapat nilai Baik. Latihan menulis mempertahankan kontrol panduannya sendiri.

Coba Lagi hanya ditampilkan jika antrean terbaru untuk fokus yang dipilih berisi kartu. Fokus kosong tetap menampilkan ucapan selamat dan tindakan Beranda tanpa menawarkan pengulangan kosong.

Setelah dek selesai, tanda centang hijau dan ucapan selamat ditampilkan di tengah. Beranda kembali ke Semua. Coba Lagi membangun ulang antrean berdasarkan status ulasan terbaru dan memulainya dari kartu pertama, mempertahankan fokus Total/Selesai/Jatuh Tempo/Baru meskipun ulasan tersimpan telah mengubah status kartu. Hanya jawaban sesi dan identitas percobaan yang direset; kemajuan ulasan tersimpan tetap utuh. Latihan melalui tautan berbagi menggunakan tampilan selesai yang sama dan memulai ulang sesi sementara.

### Spesifikasi Teknis

Dek menggunakan jenis sumber daya `studyDeck` dan kemampuan baca `study:flashcards:read`. Kontrol Berbagi Cognis mendukung pengguna, tautan publik, masa berlaku, kata sandi, dan pencabutan. Hanya pemilik dapat mengubah atau menghapus dek. Penerima dapat belajar dengan jadwal terpisah per akun; ekspor hanya untuk pembuat atau administrator. Tamu tautan belajar sementara tanpa mengubah jadwal akun. Masa berlaku dan pencabutan diperiksa pada setiap operasi dek.

Berbagi memberikan akses terbatas pada dek ke kartu dan definisi Pustaka terkini, tanpa akses umum ke Pustaka atau perubahan cakupan kartu. Setelah izin berbagi diperiksa, ID diambil dengan hak pemilik. Kartu yang tidak tersedia atau berasal dari penyedia nonaktif dilewati. Metadata galeri dan respons penilaian tidak menampilkan salinan kartu tersimpan. Penghapusan dek mencabut berbagi serta menghapus jadwal dan bukti penerimaan jawaban.

Impor dan ekspor memakai teks UTF-8 dengan kolom berpetik yang dipisahkan tab: Front, Back, dan Pronunciation opsional. Ekspor menyertakan kepala Anki untuk pemisah, dek, dan teks biasa serta konteks Cognis opsional yang dapat diabaikan Anki. Kutipan, tab, dan baris baru dipertahankan. Format ini adalah TSV, bukan arsip `.apkg`. Riwayat belajar pribadi tidak diekspor.

### Penelusuran dan Favorit Study

Perilaku ini dijelaskan dalam [kontrak bersama](/docs/study-language-framework/technical).

### Dek Awal dari Penyedia

Deskriptor bahasa dapat menetapkan `starterDecks` berupa `{ key, name, schemaId, sourceRecordIds }`. Kunci stabil dalam paket, nama dipetakan per bahasa, dan hingga 500 kunci rekaman unik menentukan urutan belajar. Cognis menyelesaikan rekaman Library global menjadi ID Library kanonis. ID dek tetap stabil lintas revisi. Dek tidak lengkap dan penyedia nonaktif disembunyikan. Dek awal hanya-baca; jadwal dan favorit tetap pribadi. Detail kartu baru dimuat ketika dek dibuka.

Flashcards memuat stylesheet bersama page-builder dan page-sections seperti Explore dan Requests. Setiap pemasangan memiliki cakupan interaksi yang dapat dibatalkan agar handler jelajah atau belajar lama tidak tetap aktif setelah navigasi. Gaya adapter tidak menimpa kelas composer, shell, atau tombol bersama; pemeriksaan regresi memastikan batas ini dan dependensi stylesheet.

Pembuatan dan impor dek yang berhasil menutup editor terlindungi sebelum membuka halaman jelajah yang diperbarui, sehingga perubahan tersimpan tidak memicu dialog pembuangan. Hasil Library khusus favorit menampilkan kartu anak terpilih secara mandiri; urutan penyedia memulihkan penempatan bersarang asli.

### Kontrol Belajar Tersimpan

Mode Reading/Writing disimpan sebagai preferensi akun dalam menu mengambang composer; defaultnya Reading. Perubahan saat latihan meminta konfirmasi melalui popup peringatan bersama sebelum mengulang antrean. Pembatalan mempertahankan posisi dan jawaban; ulasan yang telah dikirim tetap tersimpan. Bilah samping mencakup Semua dan menandai dek aktif. Judul papan bersama menyamarkan karakter hingga sengaja diungkap. Aktivasi kedua meminta konfirmasi navigasi di luar Explore; di dalam Explore kartu langsung dibuka. Aktivasi papan ketik mengikuti interaksi yang sama.

Kartu kosakata baru otomatis mendeteksi kelas dan tag transformasi yang didukung melalui kamus saat input diselesaikan dan sebelum disimpan. Tag manual dipertahankan; kelas ambigu tetap memerlukan pilihan pengguna. Hasil yang terlambat tidak mengubah draf lain. Pratinjau bentuk verba, adjektiva/adverbia, dan jamak meminta audio transformasi yang dipilih. Atribusi sumber pada judul menautkan kartu dasar. Kontrol unggahan memakai selektor terpisah dari audio pemutar untuk mencegah kegagalan inisialisasi editor karakter.

Menu samping dek bergulir bersama dokumen. Menampilkan navigasi utama tidak mengubah ukuran area gulir samping terpisah atau menggeser kartu.

### Mode Latihan Terlihat dan Kontrol Bertema

Pemilih Baca/Tulis persisten kini menampilkan slot mengambangnya di halaman Flashcards. Perubahan mode tetap menyimpan preferensi dan meminta konfirmasi untuk memulai ulang sesi. Ikon ekspor dan pengaturan Study mengikuti warna kontrol aktif, tema terang/gelap aplikasi, dan keadaan hover tanpa bergantung pada tema sistem operasi.

Jawaban dapat menyertakan objek `attempt` dengan `id` dan waktu ISO `occurredAt`. Kirim ulang objek dan nilai yang sama untuk mencoba lagi; jawaban baru memakai ID baru. Bukti penerimaan dan jadwal disimpan bersama, sedangkan ID peristiwa stabil mencegah duplikasi Kemajuan. Riwayat peramban mempertahankan percobaan tertunda tanpa data dalam URL. Kartu latihan menyatakan ketergantungan pada Pustaka dan Kemajuan. Kartu bersama beserta skemanya memuat data Pustaka terkini setelah otorisasi berbagi.

### Imbalan Latihan Tersimpan

Jadwal kartu belajar dan bukti percobaan disimpan sebelum pengiriman imbalan lintas adapter. Alur terpisah `study:decks:recordResult` mengirim ulang hasil yang sama setelah kegagalan tanpa memajukan jadwal lagi. Ini menghindari transaksi basis data bersarang ketika Progress menyimpan peristiwa.

Perilaku ini dijelaskan dalam [kontrak bersama](/docs/gateways/study/technical).

Titik masuk peramban utama adalah `ui/app/index.js`; modul tindakan, tampilan, bahasa, dan latihan berada di sebelahnya. Dek bersama memakai `ui/app/shared-deck.js`. Perilaku dek di server memakai `service/index.ts` bersama modul rute, alur, penyimpanan, dan hasil dalam direktori layanan yang sama.

### Pemilihan Latihan Merata

Perilaku ini dijelaskan dalam [kontrak bersama](/docs/gateways/study/technical).

Mode membaca memakai normalisasi isi jawaban yang sama untuk pemilihan pengecoh, petunjuk, dan penilaian. Tanda baca akhir kalimat, kapitalisasi, bentuk Unicode yang kompatibel, dan spasi berulang tidak membedakan jawaban. Tanda baca internal, angka, aksen, dan kata yang berbeda tetap bermakna. Makna setara tidak menjadi pilihan yang saling bersaing; kuis memakai dua hingga empat pilihan berbeda bila tersedia. Jawaban setara yang benar menerima nilai keberhasilan biasa sebelum progres dikirim.

Menu samping dek bergulir sendiri dalam tinggi halaman yang terlihat. Daftar dek panjang tidak memperpanjang halaman atau mendorong latihan ke bawah layar.

Membuka dek lain langsung menampilkan kontennya; kembali dari Explore mempertahankan posisi latihan tersimpan.

### Halaman Study luring kosong

Perilaku ini dijelaskan dalam [kontrak bersama](/docs/api/technical).

### Hasil Antrean Tersimpan

Ulasan kartu dalam antrean mempertahankan hasil berhasil meskipun pencatatan aktivitas opsional gagal. Pencatatan tidak menghambat bukti ulasan. Batas akun, persetujuan, dan antrean yang sudah ada tetap berlaku.

### Ruang Kerja Luring

Perilaku ini dijelaskan dalam [kontrak bersama](/docs/api/technical).

### Latihan Study Luring

Perilaku ini dijelaskan dalam [kontrak bersama](/docs/api/technical).

### Berbagi dan Pengujian Andal

Hook berbagi Calendar dan Flashcards menangani hasil kosong dari penyedia sumber daya lain, sehingga tautan dan pembagian akun dapat dibuat serta dibuka ketika semua penyedia aktif. Tampilan pemuatan, status pembagian akun, dan kalender tamu memakai ukuran minimum responsif tanpa mewajibkan delapan kolom kisi, sehingga tetap dapat digunakan pada layar sempit. Pemeliharaan berbagi berjalan berurutan, menggabungkan permintaan yang tumpang tindih, menghentikan putaran yang gagal, dan mencoba lagi pada interval lima belas menit berikutnya. Penonaktifan menghentikan pekerjaan berikutnya; pengaktifan kembali melanjutkan jadwal.

Latihan Flashcard tamu memakai pilihan mode sementara dan menonaktifkan fitur akun serta penyimpanan tata letak. Latihan ini tidak membaca atau menulis preferensi latihan akun.

### Peninjauan dan Siklus Hidup

Pemuatan halaman tamu memeriksa pembatalan setelah lokalisasi, inisialisasi composer, pemuatan sesi dan penyedia, serta impor gaya dan renderer. Composer, popup Calendar, dan permintaan sumber daya memakai sinyal halaman. Halaman yang dibatalkan tidak dapat menimpa halaman berikutnya atau melaporkan hasil lama. Putaran pemeliharaan juga meneruskan sinyal pembatalan kepada tugasnya; penonaktifan Share mencegah notifikasi kedaluwarsa berikutnya dalam pemindaian yang sedang berjalan.

## Keamanan

Operasi dek memeriksa kepemilikan dan akses berbagi. Ekspor memerlukan pembuat atau administrator; berbagi tidak memberi keanggotaan kelas atau hadiah dari peristiwa impor sembarang.

## Referensi

### Spesifikasi Teknis

| Halaman / bagian                          | Panduan               | Akses          |
| ----------------------------------------- | --------------------- | -------------- |
| `^/study/(?:[a-z-]+/)?flashcards(?:/\|$)` | Panduan Kartu Belajar | Pengguna masuk |
| Flashcards · `[data-study-deck]`          | Kelola Dek            | Pengguna masuk |
| Flashcards · `[data-practice]`            | Latihan Dengan Dek    | Pengguna masuk |

Perilaku ini dijelaskan dalam [kontrak bersama](/docs/adapters/social/messages/technical).

Panduan pengelolaan memakai wadah dek terpilih sebagai batas, termasuk kontrol edit, berbagi, dan ekspor. Panduan tetap tidak tersedia dalam daftar dek.

Panduan latihan mencakup tugas dan umpan balik. Pilih membaca atau menulis melalui pemilih menu mengambang setelah panduan selesai; pemilih tersebut tidak tersedia saat panduan memakai menu.
