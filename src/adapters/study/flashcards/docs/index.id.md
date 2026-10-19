# Adaptor Kartu Belajar

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

Mode Reading/Writing disimpan sebagai preferensi akun dalam menu mengambang composer; defaultnya Reading. Perubahan saat latihan meminta konfirmasi melalui popup peringatan bersama sebelum mengulang antrean. Pembatalan mempertahankan posisi dan jawaban; ulasan yang telah dikirim tetap tersimpan. Bilah samping mencakup Semua dan menandai dek aktif. Judul menulis memburamkan glif pengganti berukuran sama. Klik pertama menampilkan karakter dan mengaktifkan tautan Explore; klik kedua meminta konfirmasi navigasi. Aktivasi papan ketik mengikuti interaksi yang sama.

Kartu kosakata baru otomatis mendeteksi kelas dan tag transformasi yang didukung melalui kamus saat input diselesaikan dan sebelum disimpan. Tag manual dipertahankan; kelas ambigu tetap memerlukan pilihan pengguna. Hasil yang terlambat tidak mengubah draf lain. Pratinjau bentuk verba, adjektiva/adverbia, dan jamak meminta audio transformasi yang dipilih. Atribusi sumber pada judul menautkan kartu dasar. Kontrol unggahan memakai selektor terpisah dari audio pemutar untuk mencegah kegagalan inisialisasi editor karakter.

Menu samping dek bergulir bersama dokumen. Menampilkan navigasi utama tidak mengubah ukuran area gulir samping terpisah atau menggeser kartu.

## Mode Latihan Terlihat dan Kontrol Bertema

Pemilih Baca/Tulis persisten kini menampilkan slot mengambangnya di halaman Flashcards. Perubahan mode tetap menyimpan preferensi dan meminta konfirmasi untuk memulai ulang sesi. Ikon ekspor dan pengaturan Study mengikuti warna kontrol aktif, tema terang/gelap aplikasi, dan keadaan hover tanpa bergantung pada tema sistem operasi.

Jawaban dapat menyertakan objek `attempt` dengan `id` dan waktu ISO `occurredAt`. Kirim ulang objek dan nilai yang sama untuk mencoba lagi; jawaban baru memakai ID baru. Bukti penerimaan dan jadwal disimpan bersama, sedangkan ID peristiwa stabil mencegah duplikasi Kemajuan. Riwayat peramban mempertahankan percobaan tertunda tanpa data dalam URL. Kartu latihan menyatakan ketergantungan pada Pustaka dan Kemajuan. Kartu bersama beserta skemanya memuat data Pustaka terkini setelah otorisasi berbagi.

## Imbalan Latihan Tersimpan

Jadwal kartu belajar dan bukti percobaan disimpan sebelum pengiriman imbalan lintas adapter. Alur terpisah `study:decks:recordResult` mengirim ulang hasil yang sama setelah kegagalan tanpa memajukan jadwal lagi. Ini menghindari transaksi basis data bersarang ketika Progress menyimpan peristiwa.
