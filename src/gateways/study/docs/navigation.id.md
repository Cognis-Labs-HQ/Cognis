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

## Belajar Offline

Mode Offline aktif secara bawaan di Pengaturan. Menonaktifkannya memulihkan peringatan koneksi dan pesan kesalahan yang ada serta menonaktifkan fallback worker. Saat aktif, hilangnya koneksi mengalihkan aplikasi ke mode offline tanpa pemberitahuan kesalahan; navigasi yang tidak tersedia diblokir tanpa popup kesalahan.

Study menyimpan snapshot JSON ringan dengan batas ukuran di tab saat ini: skema, data karakter/kartu yang diizinkan, lokasi, ID yang telah dilihat, favorit, dan dek yang pernah dibuka. Skema bahasa mengaktifkannya melalui `metadata.offline: { cache: "lightweight" }`. Cache Library menampung paling banyak 16 MB dan 100 pembacaan; cache baca lain paling banyak 4 MB dan 100 pembacaan. Byte audio, respons kamus, kredensial, dan dokumen terautentikasi tidak disimpan secara permanen.

Pratinjau Explore memakai data cache yang telah diotorisasi. Menggambar dan latihan kartu bekerja secara lokal. Penyelesaian, ulasan, ID yang dilihat, dan status akhir favorit diantrekan; progres, XP, dan hadiah menjadi resmi setelah konfirmasi server. Audio serta permintaan kamus/ElevenLabs berhenti. Penyuntingan, penghapusan, dan berbagi memerlukan koneksi. Hanya konten yang pernah dimuat dalam batas cache yang tersedia.

Study privat memerlukan sesi akun yang sama, pernah diverifikasi, dan belum kedaluwarsa di tab yang sama. Muat ulang privat secara luring memerlukan koneksi; kunjungan pertama ke hub di tab terverifikasi dapat dilakukan setelah persiapan latar belakang. Perubahan akun/sesi, preferensi, siklus hidup modul, dan pelepasan penyedia membatalkan snapshot privat. Pencabutan akses server tidak dapat diketahui saat terputus. Pemulihan memakai penjaga perubahan yang belum disimpan lalu memuat ulang otorisasi server.

## Antrean dan Persetujuan

Host menyediakan `offline:outbox`, `offline:state`, dan `offline:accessPolicy` melalui ctx. Komponen mendaftarkan pengirim selama masa hidup penyedia dan ID operasi stabil melalui `offline:enqueue`; `offline:flush` mengotorisasi dan mengirim. Antrean permanen per akun dibatasi 1.000 catatan dan 1 MB selama tujuh hari, tanpa token. ID serta waktu asli dipertahankan; kegagalan sementara dicoba ulang, catatan yang dikonfirmasi atau ditolak permanen dihapus. Penolakan menampilkan peringatan terlokalisasi. Keluar menghapus antrean akun; pergantian akun tidak mengirim data akun lain. Menonaktifkan Mode Offline menghentikan catatan baru. Antrean lama tetap dapat dikirim saat online.

Pemulihan memperbarui penyedia dan menjalankan `authenticate-session` sebelum tahap akhir `afterSession` mengirim aktivitas. Penyedia wajib mendeklarasikan `offlineAccessGuard` dalam katalog server. Persyaratan yang tidak diketahui atau persetujuan yang belum ada memblokir akses offline. Terms of Service menyimpan versi dokumen terakhir yang diambil dan persetujuan terkonfirmasi server per akun. Versi baru yang belum disetujui langsung memblokir pembacaan, navigasi, dan catatan offline serta pengiriman sampai persetujuan online berhasil. Persetujuan offline tidak tersedia. Snapshot privat tetap di tab; hanya antrean terbatas dan snapshot dokumen hukum bertahan setelah muat ulang. Tahap awal `beforeSession` menghapus verifikasi pengiriman sebelumnya sebelum setiap autentikasi.

## Akses Dashboard dan Study

Dashboard menyatakan akses luring privat yang hanya berlaku dalam sesi dan mempertahankan ringkasan akun serta acara mendatang yang tersimpan. Ekstensi Dashboard opsional yang diambil dari server dilewati saat dibuka kembali secara luring. Penyedia Study mendaftarkan rute hub dan menggunakan snapshot katalog bahasa, preferensi belajar, serta tautan modul yang terikat akun dan sesi melalui alur `study:navigation`. Pemuatan bilah navigasi menyiapkan metadata ringan hub. Explore dan kartu belajar tetap menggunakan deklarasi rute milik penyedianya; halaman yang tidak didukung tetap memakai pemulihan tanpa dialog kesalahan. Kontrol pemilihan bahasa belajar memerlukan koneksi.

## Halaman Study luring kosong

Halaman Study yang sudah disiapkan tetap dapat dibuka dalam sesi luring terverifikasi dengan persetujuan wajib meskipun snapshot konten privat belum ada. Metadata bahasa atau preferensi yang hilang menghasilkan navigasi kosong. Explore memasang tampilan kosong normal dan menampilkan “Tidak ada konten luring tersimpan yang tersedia” alih-alih kesalahan rute atau toast kesalahan. Flashcards juga mempertahankan halaman kosong jika data dek atau sumber tampilan wajib belum tersedia. Pemberitahuan terikat halaman saat ini dan tidak diduplikasi. Kekurangan cache tidak menyembunyikan penolakan akses atau persetujuan. Library dan Flashcards menyiapkan terjemahan publik serta templat ringan saat daring; data privat tetap berada dalam cache tab yang dibatasi.

## Aset Study Luring

Study menyiapkan ikon popup, templat gambar, gaya gambar, dan ikon tutup saat daring tanpa membuka papan gambar atau menghalangi login. Persiapan dicoba kembali setelah koneksi pulih dan berhenti bersama penyedianya. Karakter yang sudah tersimpan dapat membuka papan gambar untuk pertama kali saat luring. Penyuntingan konten tidak tersedia saat luring; popup detail yang terbuka menonaktifkan Sunting ketika koneksi hilang. Ikon popup dekoratif yang tidak tersedia mempertahankan label tindakan terjemahannya tanpa membuka dialog kesalahan sumber daya.

## Ketersediaan Luring

Registri rute luring bertahan pada impor berulang dari bundel maupun berkas langsung. Deskriptor rute yang dibentuk ulang mempertahankan ketersediaan jika skrip, gaya, dan penyedia kapabilitas tetap sama; aset yang berubah harus disiapkan ulang. Pesan menyiapkan daftar ruang, terjemahan, dan katalog emoji setelah login terverifikasi. Halaman dapat dibuka luring sebelum kunjungan daring pertama. Hanya ruang dan riwayat tersimpan yang dibuka otomatis; memilih riwayat yang belum tersimpan menampilkan toast informasi khusus. Explore mempertahankan koleksi tersimpan yang tersedia jika koleksi lain atau penanda sudah dilihat tidak ditemukan. Penolakan akses dan persetujuan tetap diteruskan. Tindakan banner ditempatkan langsung dalam baris tindakan bersama sehingga pergeseran vertikal bawaan hilang.

## Favorit Study Bersama

Penyedia Study menyediakan `study:favourites` dengan operasi `load`, `toggle`, dan `has` yang mengikuti masa hidup penyedia. Utilitas tampilan memakai kapabilitas ctx ini, bukan cache terpisah per pemuat. Favorit disiapkan setelah autentikasi terverifikasi, menerapkan perubahan tertunda, dan berbagi keadaan terikat akun/sesi antara Explore, kartu belajar, dan impor berulang. Jika snapshot favorit opsional belum tersedia, pilihan kosong tetap menerapkan perubahan dalam antrean tanpa menyembunyikan konten atau menampilkan toast gagal memperbarui. Pergantian akun mengosongkan pilihan yang terlihat. Penolakan akses tidak pernah dianggap sebagai cache yang tidak ditemukan.

## Ruang Kerja Luring

Setelah masuk terverifikasi, Study menyiapkan skema, lokasi yang dapat dibaca, formulir, penanda dilihat, dan koleksi ringan yang diizinkan untuk bahasa belajar serta mengajar yang diikuti. Flashcards menyiapkan daftar dan hingga 80 dek yang sesuai beserta detail kartu dalam batas cache yang ada. Perubahan keikutsertaan memicu persiapan ulang. Dua worker membatasi pembacaan bersamaan; penghentian penyedia, pergantian akun, penolakan akses, dan persetujuan hukum tersimpan tetap diberlakukan. Halaman tidak perlu dikunjungi sebelumnya; cuplikan privat tetap terikat tab dan sesi terverifikasi.

## Latihan Study Luring

Pengelolaan Library serta halaman pengeditan, pencarian, dan permintaannya memerlukan koneksi. Beranda Study dan submenu menyembunyikan tautan tersebut saat luring, termasuk segera setelah koneksi terputus. Explore tetap tersedia untuk membaca konten tersimpan dan menggambar. Penyedia Library hanya mendaftarkan Explore sebagai rute sesi luring.

Persiapan bahasa yang diikuti menyimpan katalog skema bersama selain katalog tiap bahasa. Menggambar dan Flashcards dapat memakai pembacaan skema biasa tanpa kunjungan halaman daring sebelumnya. Flashcards menyiapkan terjemahan Share dan Study serta templat galeri, lalu membaca koleksi bahasa terpilih dengan permintaan berskema yang sama seperti persiapan keikutsertaan. Dek yang disiapkan dapat membuka galeri dan latihan luring. Audio, pengambilan kamus, pengeditan konten, serta pemeriksaan akses dan persetujuan tetap mengikuti pembatasan yang ada.
