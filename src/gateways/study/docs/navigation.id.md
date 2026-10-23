# Navigasi Study

Halaman Study berbagi satu slot subnavigasi composer, memakai label navigasi dan tindakan bersama dari ui.reuse dalam keempat bahasa, serta menentukan rute aktif saat dirender. Lingkup router yang dibatalkan tetap dibatalkan ketika diganti. Kegagalan pratinjau gambar menampilkan notifikasi galat terlokalisasi dan membuka kunci status agar dapat dicoba lagi.

Kemajuan menggambar menyimpan setiap ID percobaan yang telah dikirim bersama penghitungnya, sehingga pengiriman ulang A setelah B maupun setelah mulai ulang tidak meningkatkan kesulitan panduan lagi. Integrasi kemajuan dan imbalan tervalidasi yang sama tetap aktif.

Flashcards memakai `/study/<iso>/flashcards` dan `/study/<iso>/flashcards/<deck-id>`. Kontrol bahasa membuka galeri terkait tanpa membawa dek bahasa lain. `/study/flashcards` menentukan bahasa saat ini. Pustaka dan Permintaan tetap merupakan halaman bersama.

## Contoh penggunaan

Buka `/study/ja/flashcards` untuk deck Jepang; memilih Inggris membuka `/study/en/flashcards`.

## Spesifikasi teknis

Galeri menentukan bahasa dari jalur dan memfilter deck yang terlihat melalui kontrak publik Study. URL detail menyebut bahasa serta UUID deck; pergantian bahasa kembali ke galeri yang sesuai. Navigasi tidak membawa data kueri sementara.

Study menggunakan `navigationLabels` terlokalisasi dari deskriptor rute adapter aktif untuk tautan milik adapter, termasuk Permintaan. Kunci label tersebut tidak dicari melalui paket bahasa gateway. Label dipilih berdasarkan lokal UI yang tepat, bahasa dasarnya, lalu bahasa Inggris; tautan milik Study tetap memakai sumber daya XML gateway.

## Ukuran panel gambar konsisten

Panel gambar mengambang dibuka dalam bingkai besar yang tidak bergantung pada rasio aspek kata atau pola. Pergantian kartu mempertahankan posisi dan ukuran yang disesuaikan pengguna; proporsi gambar tetap terjaga.

## Panduan goresan yang konsisten

Sebelum masukan pertama, pola yang belum pernah diselesaikan menampilkan seluruh goresan. Setelah masukan dimulai, hanya goresan berikutnya yang dipandu, termasuk saat berpindah karakter. Pola yang pernah diselesaikan langsung memakai panduan goresan berikutnya, dengan pengujian goresan tersembunyi dan tombol pengungkap tetap tersedia.

## Simpan kemajuan menggambar

Status penyelesaian dan jumlah goresan yang disembunyikan disimpan per akun dan kartu melalui penyimpanan preferensi. Setiap percobaan, pengaturan ulang, dan pengulangan memilih posisi acak berbeda berdasarkan jumlah tersebut. Penyelesaian dengan paling banyak satu kesalahan menambah jumlahnya satu, dibatasi jumlah goresan pola saat ini. Pola yang pernah diselesaikan tetap memandu goresan berikutnya, sedangkan pola yang belum selesai menampilkan seluruh pola sebelum masukan. Permintaan GET dan POST terautentikasi ke `/api/v1/study/drawing/:cardId` menjalankan alur `study:drawing:readProgress` dan `study:drawing:complete`; peramban tidak mengirim identitas akun.

Goresan terakhir yang diterima langsung menyimpan penyelesaian dan tingkat kesulitan berikutnya. Menutup papan gambar atau meninggalkan Explore tidak membatalkan penyimpanan. Membuka kembali kartu yang sama dan mencoba lagi menunggu kemajuan tersimpan sebelum memilih goresan tersembunyi.

## Sembunyikan jawaban menulis

Judul pad mula-mula menyamarkan karakter dengan tombol standar untuk membukanya. Memuat karakter lain menyamarkannya kembali. Sesi mengambang menyediakan kartu aktif melalui kapabilitas yang dapat dilepas `study:drawing:observe`. Pratinjau Library yang cocok tetap terbuka, diburamkan, dan tidak interaktif sampai pad berganti karakter atau ditutup; bacaan dan arti tetap tersedia di pad. Mode Menulis tertanam memakai penyamaran yang sama serta melaporkan pembukaan karakter sebagai percobaan berbantuan.

## Kontrol Belajar Tersimpan

Pilihan kamus menggunakan theme-select dan disembunyikan jika hanya ada satu penyedia. Pengaturan berada di kanan input pencarian kamus. KANJIDIC2 memperkaya data kanji dan bukan pilihan pencarian sejajar dengan Jisho; sumber referensi menggunakan nama katalog sebenarnya.

Mode Reading/Writing disimpan sebagai preferensi akun dalam menu mengambang composer; defaultnya Reading. Perubahan saat latihan meminta konfirmasi melalui popup peringatan bersama sebelum mengulang antrean. Pembatalan mempertahankan posisi dan jawaban; ulasan yang telah dikirim tetap tersimpan. Bilah samping mencakup Semua dan menandai dek aktif. Judul menulis memburamkan glif pengganti berukuran sama. Klik pertama menampilkan karakter dan mengaktifkan tautan Explore; klik kedua meminta konfirmasi navigasi. Aktivasi papan ketik mengikuti interaksi yang sama.

## Navigasi Panel Menulis

Membuka panel menulis dari detail kartu menutup popup detail setelah panel berhasil terbuka. Judul tersembunyi tetap ditampilkan pada klik pertama. Di Explore, klik berikutnya membuka kartu langsung; halaman Study lainnya tetap meminta konfirmasi sebelum berpindah ke Explore.

Pilihan jawaban kartu belajar berupa tombol jawaban tersendiri. Judul kartu dan jawaban yang diungkap menggunakan tindakan dalam aplikasi dengan konfirmasi keluar dan urutan dek yang tetap terjaga, tanpa menampilkan URL kartu saat diarahkan penunjuk. Di Explore, klik kedua pada judul gambar yang telah diungkap membuka kartu langsung melalui tindakan tanpa URL.

Latihan menulis hanya menggunakan judul tersamarkan pada papan gambar. Panah SVG sebelumnya/berikutnya berada di atas papan bersama kontrol favorit; berikutnya tetap memerlukan jawaban. Flashcards meneruskan `suppressRetry: true` ke papan bersama untuk menyembunyikan dan menonaktifkan percobaan ulang; latihan mandiri tetap mengizinkannya secara bawaan.

Pengguna papan tertanam dapat menyediakan `onNavigate(card)` setelah konfirmasi judul bersama. Flashcards menggunakannya untuk mencatat percobaan saat ini melalui alur keluar dan mempertahankan konteks navigasi dek sebelum membuka Explore.

## Aksi Peramban yang Diperluas

Klien Library di peramban memperoleh `study:library:client` melalui ctx. Penyedianya mendaftarkan `study:library:<clientFunction>` dengan tahap `before`, `execute`, dan `after` untuk pembacaan, kamus, permintaan, impor, dan media. Kapabilitas yang diwajibkan rute memuat penyedia sebelum halaman dipasang. Lihat dokumentasi adaptor Library untuk argumen ekstensi, penolakan, dan pelepasan.

## Patuhi Autentikasi Study

Study memerlukan gateway Authentication dan kapabilitas `auth:routeContext` sebelum mendaftarkan rute. Administrasi adaptor, penemuan bahasa, dan rute menggambar menggunakan konteks yang disuntikkan, termasuk pemeriksaan akses khusus. Kontrak autentikasi yang tidak tersedia menggagalkan bootstrap alih-alih memilih pemeriksaan bawaan.

## Pemilihan Latihan Merata

Panduan menggambar dan pengacakan jawaban kartu belajar menggunakan pembantu `randomIndex` yang sama. Pembantu ini menggunakan Web Crypto dengan pengambilan sampel penolakan bermasker untuk rentang bilangan bulat dari 1 hingga 2^32 tanpa bias modulo. Rentang dengan satu posisi tidak membutuhkan entropi. Pemanggil dapat menyuntikkan sumber entropi untuk pengujian deterministik; latihan biasa selalu menggunakan Web Crypto.

## Isolasi dan siklus komponen

API mendelegasikan ruang nama ekstensi melalui kebijakan milik gateway aktif; Study memiliki aturan ruang nama bahasa. Kapabilitas penyedia Library ditarik saat adaptor atau dependensi Study dinonaktifkan, menolak referensi fungsi yang disimpan, dan kembali saat diaktifkan. Bootstrap adaptor Study menyediakan `onAvailabilityChange(listener)` untuk kontribusi sesuai siklus hidup; kegagalan bootstrap menarik kontribusi tersebut.
