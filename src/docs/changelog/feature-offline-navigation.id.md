# Navigasi Offline

**Cabang Fitur:** feature-offline-navigation

## Kontrak Offline

Build produksi menyiapkan halaman pemulihan netral. Lisensi dan halaman Kesalahan berfungsi offline; tautan rute yang tidak tersedia dinonaktifkan dan navigasi langsung yang tidak tersedia tidak menampilkan kesalahan. Kegagalan koneksi server mengaktifkan pengganti meskipun browser melaporkan jaringan aktif.

Deklarasikan `public: true` dan `offline: { assets: [...] }` pada rute SPA. Cantumkan semua dependensi runtime publik, termasuk katalog bahasa dan berkas data. Halaman harus bekerja tanpa permintaan API, data akun privat, atau penemuan seluruh penyedia host. Rute privat tidak dapat ikut serta. Gunakan tautan rute untuk navigasi. Dependensi yang belum dikenal atau diambil tetap tidak tersedia.

Service worker tidak menyimpan respons API, kredensial, atau HTML terautentikasi. Invalidasi modul menghapus katalog rute publik dan aset modul; aset dengan revisi harus cocok dengan katalog saat ini. Perubahan jarak jauh tidak dapat diketahui saat terputus: hanya revisi publik terakhir yang diketahui tersedia. Pemulihan memperbarui katalog dan memuat ulang melalui penjaga perubahan yang belum disimpan, lalu memulihkan otorisasi server terbaru. Pembaruan worker menunggu tab yang ada ditutup dan menyiapkan aset pemulihan sebelum aktivasi. Kunjungan pertama tanpa worker terpasang tidak dapat dimulai offline.

## Pilihan Pengingat

Pilih beberapa pengingat melalui kotak centang standar yang terlihat dan simpan semuanya sekaligus. Menghapus seluruh pilihan menonaktifkan pengingat, termasuk ketika kalender memiliki nilai bawaan. Jarak waktu pengingat khusus yang sudah ada tetap tersedia saat mengedit.

## Belajar Offline

Mode Offline aktif secara bawaan di Pengaturan. Menonaktifkannya memulihkan peringatan koneksi dan pesan kesalahan yang ada serta menonaktifkan fallback worker. Saat aktif, hilangnya koneksi mengalihkan aplikasi ke mode offline tanpa pemberitahuan kesalahan; navigasi yang tidak tersedia diblokir tanpa popup kesalahan.

Study menyimpan snapshot JSON ringan dengan batas ukuran di tab saat ini: skema, data karakter/kartu yang diizinkan, lokasi, ID yang telah dilihat, favorit, dan dek yang pernah dibuka. Skema bahasa mengaktifkannya melalui `metadata.offline: { cache: "lightweight" }`. Cache Library menampung paling banyak 16 MB dan 100 pembacaan; cache baca lain paling banyak 4 MB dan 100 pembacaan. Byte audio, respons kamus, kredensial, dan dokumen terautentikasi tidak disimpan secara permanen.

Pratinjau Explore memakai data cache yang telah diotorisasi. Menggambar dan latihan kartu bekerja secara lokal. Penyelesaian, ulasan, ID yang dilihat, dan status akhir favorit diantrekan; progres, XP, dan hadiah menjadi resmi setelah konfirmasi server. Audio serta permintaan kamus/ElevenLabs berhenti. Penyuntingan, penghapusan, dan berbagi memerlukan koneksi. Hanya konten yang pernah dimuat dalam batas cache yang tersedia.

Study privat memerlukan sesi akun yang sama, pernah diverifikasi, dan belum kedaluwarsa di tab yang sama. Muat ulang dan kunjungan pertama tetap mengikuti kontrak offline khusus halaman publik. Perubahan akun/sesi, preferensi, siklus hidup modul, dan pelepasan penyedia membatalkan snapshot privat. Pencabutan akses server tidak dapat diketahui saat terputus. Pemulihan memakai penjaga perubahan yang belum disimpan lalu memuat ulang otorisasi server.

## Antrean dan Persetujuan

Host menyediakan `offline:outbox`, `offline:state`, dan `offline:accessPolicy` melalui ctx. Komponen mendaftarkan pengirim selama masa hidup penyedia dan ID operasi stabil melalui `offline:enqueue`; `offline:flush` mengotorisasi dan mengirim. Antrean permanen per akun dibatasi 1.000 catatan dan 1 MB selama tujuh hari, tanpa token. ID serta waktu asli dipertahankan; kegagalan sementara dicoba ulang, catatan yang dikonfirmasi atau ditolak permanen dihapus. Penolakan menampilkan peringatan terlokalisasi. Keluar menghapus antrean akun; pergantian akun tidak mengirim data akun lain. Menonaktifkan Mode Offline menghentikan catatan baru. Antrean lama tetap dapat dikirim saat online.

Pemulihan memperbarui penyedia dan menjalankan `authenticate-session` sebelum tahap akhir `afterSession` mengirim aktivitas. Penyedia wajib mendeklarasikan `offlineAccessGuard` dalam katalog server. Persyaratan yang tidak diketahui atau persetujuan yang belum ada memblokir akses offline. Terms of Service menyimpan versi dokumen terakhir yang diambil dan persetujuan terkonfirmasi server per akun. Versi baru yang belum disetujui langsung memblokir pembacaan, navigasi, dan catatan offline serta pengiriman sampai persetujuan online berhasil. Persetujuan offline tidak tersedia. Snapshot privat tetap di tab; hanya antrean terbatas dan snapshot dokumen hukum bertahan setelah muat ulang. Tahap awal `beforeSession` menghapus verifikasi pengiriman sebelumnya sebelum setiap autentikasi.

## Perubahan Sosial Offline

Penyedia Profile dan Messages mendaftarkan tindakan HTTP melalui ctx sesuai masa hidupnya. Profil, pos, daftar ruang, dan percakapan terenkripsi yang pernah dimuat tersedia di tab terverifikasi. Teks profil, ketersediaan, status ikuti/blokir, tata letak banner, pembuatan/penghapusan pos, pesan terenkripsi di ruang lama, status akhir reaksi, dan tanda baca memakai buffer offline per akun. Suntingan online berikutnya menunggu antrean pemilik yang sama. Pergantian akun atau sesi selama persiapan atau menunggu buffer membatalkan tindakan. Pesan dan pos memakai UUID `operationId` stabil; pengulangan berbeda atau lintas akun ditolak. Pengiriman ulang pesan tidak menggandakan notifikasi. Tanda baca mempertahankan waktu baca awal.

Percakapan dienkripsi sebelum masuk buffer: teks asli, kunci ruang, dan kredensial tidak masuk antrean. Teks profil dan isi pos disimpan di penyimpanan browser akun saat ini. Avatar/banner hingga 350.000 byte biner berbagi antrean 1 MB/1.000 catatan/tujuh hari; gambar lebih besar memerlukan koneksi. Buffer penuh menampilkan kesalahan terlokalisasi; draf pesan dan pos baru dikosongkan setelah berhasil disimpan secara permanen. Batas berlaku untuk seluruh buffer.

Perubahan tetap tertunda sampai dikonfirmasi server. Pesan menampilkan status antrean; tindakan profil, pos, dan media menampilkan toast antrean standar. Menutup atau memuat ulang browser memicu konfirmasi perubahan belum tersimpan selama akun memiliki buffer, termasuk catatan dari penyedia nonaktif. Peringatan hilang setelah konfirmasi atau pembersihan akun. Browser menentukan teks konfirmasi dan mungkin memerlukan interaksi pengguna. Catatan tetap bertahan setelah muat ulang; peringatan tidak membuangnya.

Konten sosial tersimpan tetap hanya di tab dan memerlukan persetujuan. Kunjungan pertama, muat ulang privat offline, pembuatan ruang, pengelolaan anggota/kunci, panggilan, dan unggahan besar memerlukan koneksi. Status mengetik dan kehadiran bersifat sementara dan tidak dikirim ulang. Otorisasi server terkini diperiksa saat pengiriman; cache offline tidak dapat mengetahui pencabutan akses jarak jauh. Persetujuan ToS tetap wajib sebelum akses dan pengiriman.

## Ikon Online Terlihat

Toolbar Modules mempertahankan ukuran ikon saat gaya tombol bersama dimuat belakangan. SVG segarkan/pengaturan yang berhasil diambil tidak lagi terjepit menjadi garis sempit akibat padding tombol.

## Inisialisasi Profil

Ketersediaan profil dimulai saat penyedia dipasang setelah klien buffer terdaftar dan gaya avatar siap. Impor penyedia tidak memulai callback kehadiran atau polling. Penonaktifan dan pemasangan gagal menghapus langganan, listener halaman, timer, dan cache ketersediaan; pekerjaan asinkron lama tidak memperbarui cakupan penyedia berikutnya. Ini mencegah `profile_client_unavailable` saat halaman administrasi dimuat secara online.

## Pendaftaran dan Pencarian

Setiap sesi terautentikasi memeriksa `/api/v1/auth/setup-status`, termasuk sesi setelah pengalihan SSO. Pemilik notifikasi menyediakan penyiapan email wajib melalui `auth:getSetupIntegrations(accountId, role)`, yang mengembalikan skrip dari asal yang sama dengan ekspor `enforceSetup({ accountId })`. Penyiapan selesai sebelum sesi diizinkan bernavigasi atau digunakan luring. Gangguan SMTP tidak membatalkan kewajiban verifikasi; administrator pendiri awal tetap dikecualikan.

Verifikasi SMTP berlaku untuk akun SSO dan akun lokal. Pengiriman ulang menggunakan layanan pengiriman notifikasi yang dikonfigurasi. Kode dan tautan verifikasi mengikat ID akun lengkap dan email sebagai tupel buram, termasuk ID SSO dengan ruang nama. Membatalkan verifikasi dari Pengaturan mempertahankan alamat email yang ada.

Administrasi menyimpan izin pendaftaran akun lokal publik secara terpisah dari adapter pendaftaran. Aktifkan adapter publik dan nonaktifkan pendaftaran lokal untuk mengizinkan pembuatan akun SSO tanpa membuka pendaftaran nama pengguna/kata sandi publik. Menonaktifkan adapter juga menutup jalur pembuatan tersebut; token undangan tetap tersedia melalui adapternya sendiri. Pencarian global menampilkan hasil parsial, membatalkan kueri yang diganti, dan membatasi waktu penyedia pencarian. Judul dokumentasi muncul sebelum isi; empat pekerja yang dapat dibatalkan mengindeks isi dokumen alih-alih mengambil seluruh pustaka sekaligus.

## Koneksi dan Akun

Kebijakan pekerja luring dan metadata rute menggunakan cache kontrol terpisah. Permintaan katalog digabungkan, perubahan kebijakan mempertahankan urutan, port pesan ditutup, dan pembersihan aset di latar belakang tidak menunda balasan. Instalasi mengambil paling banyak empat aset sekaligus. Login tidak menunggu pemeliharaan cache publik dan menampilkan roda pemuatan bersama selama permintaan kredensial, kode TFA, dan otorisasi SSO. Penyiapan interaktif tetap dapat digunakan. Pemeriksaan keterjangkauan membalas dengan cepat; pemeriksaan komponen terperinci tetap di `/api/v1/system/health`.

Nama profil SSO publik tidak menyertakan ruang nama penyedia. Nama berawalan penyedia yang sudah ada diganti saat inisialisasi profil; benturan diberi akhiran acak. Nama yang sudah netral tetap stabil. ID akun, pemetaan identitas, kiriman, dan hubungan tidak berubah. URL profil publik berubah ketika namanya berubah. Metadata penyedia, email, dan riwayat login tetap berada di antarmuka Pengguna khusus administrator. Bagian detail tiap akun memakai gaya bagian yang dapat diciutkan dan mengambil metadata terotorisasi saat dibuka.

Administrator dan pemilik dapat membuka `/invite` tanpa status pendiri. Kebijakan undangan tetap mengatur penerbitan. Adapter Token Pendaftaran yang aktif menyediakan `cognisctl invite:token:generate` untuk membuat token mandiri tanpa pengiriman SMTP, dan `cognisctl invite:email:send person@example.com` untuk mengirim undangan. Tanpa argumen email, panduan masukan CLI dibuka. Kedua perintah menggunakan API pendaftaran terautentikasi serta mematuhi pembatasan peran, domain, dan pengiriman.

## Tata Letak Daftar Pengguna

Daftar Pengguna memakai seluruh lebar composer yang tersedia. Setiap akun menjadi satu baris yang dapat dibuka, dengan identitas, peran, status, dan kontrol pengelolaan di bagian kepala; metadata yang diperluas memenuhi lebar baris di bawahnya. Detail memakai kisi label dan nilai yang responsif, nama peran dan penyedia yang dilokalkan, serta baris email terpisah dengan penanda utama dan verifikasi. Pada layar kecil, kontrol kepala membungkus dan metadata tampil dalam satu kolom.

## Privasi akun dan isolasi keyring

Akun SSO menggunakan ID acak yang tidak mengungkap identitas penyedia. ID penyedia disimpan terpisah dan hanya ditampilkan kepada administrator; nama pengguna publik tidak memuatnya. Auth mencadangkan nama sebelum perubahan profil atau email: nama duplikat dari penyedia yang sama ditolak, sedangkan penyedia berbeda mendapat akhiran acak pendek bila perlu. Daftar pengguna dan endpoint tindakan membedakan `username` publik dari `accountId` internal.

Ini perubahan yang tidak kompatibel tanpa migrasi ID akun. Hentikan instans dan reset basis data yang memiliki ID akun SSO berisi penyedia sebelum peningkatan; Authentication menolak startup dengan `provider_account_ids_require_clean_database` daripada menampilkan ID tersebut. Hubungan dan rapat lama tidak dimigrasikan.

Brankas browser terenkripsi disimpan terpisah menurut origin, ID akun, dan ID instans akun dari server. Server harus memverifikasi akun serta instans sebelum cache dimuat. Kata sandi dan kunci dekripsi hanya ada di memori; kunci pembuka IndexedDB lama dihapus. Setelah memuat ulang, kata sandi keyring diperlukan kembali, kecuali login kata sandi berhasil mendekripsi brankas. Pergantian akun membatalkan dialog dan operasi kriptografi yang tertunda. Membuka keyring tidak membuat keyring baru; pembuatan memerlukan penyiapan atau tindakan Buat secara eksplisit.

Implementasi privasi akun dan isolasi keyring: `015e99106e7c190b999e55e73d413257fcb41725`.

## Pertahankan startup akun lokal

Akun lokal yang sudah ada tetap berfungsi meskipun ada catatan SSO lama. Startup tidak memerlukan reset basis data. Login dan provisi akun SSO lama ditolak secara individual sampai akun tersebut dibuat ulang dengan ID opak. ID akun, hubungan, dan rapat tidak dimigrasikan atau dihapus secara otomatis.

Perbaikan startup akun lokal: `894e74060ef7ff67fce1e8d45d94863ad5abd4a7`.

## Status offline dan pemulihan navigasi

Satu pemberitahuan header yang tetap terlihat menggunakan gaya callout bersama untuk menampilkan mode offline. Setelah tersambung kembali, tersedia tombol Muat Ulang tanpa pemuatan ulang otomatis; tindakan tetap menghormati perubahan yang belum disimpan atau masih dalam antrean. Halaman yang tidak tersedia terlebih dahulu mencoba memulihkan halaman sebelumnya. Jika gagal, pemuatan ulang otomatis yang dilindungi diaktifkan saat koneksi pulih. Tautan absolut dan relatif dari origin yang sama menggunakan router SPA. Katalog offline mempertahankan halaman publik dalam cache dan rute privat yang diizinkan penyedia.

## Batas polling offline

Mode Offline menghentikan polling persetujuan dan pemulihan biasa. Hanya satu pemeriksaan kesehatan server ringan berjalan setiap lima belas menit, termasuk setelah peristiwa online browser berulang. Kegagalan pemulihan koneksi saat online memperpanjang interval hingga lima belas menit. Polling persetujuan memperpanjang interval kegagalan hingga lima menit, berhenti sepenuhnya saat offline, dan dilanjutkan setelah tersambung kembali. Persetujuan dokumen wajib yang disimpan tetap menjadi syarat akses offline.

Implementasi status offline, pemulihan navigasi, dan interval polling: `b889c1fd03d733da95b11af0bff65c7bb590b679`.

## Koneksi terputus mendadak

Jika halaman aktif tidak dapat digunakan secara luring, host menghentikan siklus hidup halaman dan mencoba kembali ke halaman sebelumnya yang mendukung mode luring tanpa dialog kesalahan. Jika gagal, pemberitahuan header menjelaskan halaman yang tidak tersedia dan kontennya dikosongkan dan penyegaran otomatis dengan pengaman navigasi diaktifkan untuk saat koneksi pulih. Pewaktu kehadiran berhenti saat luring dan dimulai lagi setelah pemulihan. Terjemahan publik yang telah dimuat digunakan kembali dalam tab; katalog terlindungi tetap memerlukan permintaan terautentikasi.

## Akses Dashboard dan Study

Dashboard menyatakan akses luring privat yang hanya berlaku dalam sesi dan mempertahankan ringkasan akun serta acara mendatang yang tersimpan. Ekstensi Dashboard opsional yang diambil dari server dilewati saat dibuka kembali secara luring. Penyedia Study mendaftarkan rute hub dan menggunakan snapshot katalog bahasa, preferensi belajar, serta tautan modul yang terikat akun dan sesi melalui alur `study:navigation`. Pemuatan bilah navigasi menyiapkan metadata ringan hub. Explore dan kartu belajar tetap menggunakan deklarasi rute milik penyedianya; halaman yang tidak didukung tetap memakai pemulihan tanpa dialog kesalahan. Kontrol pemilihan bahasa belajar memerlukan koneksi. Membuka ulang kerangka aplikasi tidak lagi menulis preferensi tema secara otomatis. Perubahan preferensi antarmuka yang disengaja menggunakan klien Profile aktif agar dapat masuk ke buffer luringnya, dengan pemeriksaan akun saat penggabungan tertunda.

Implementasi: [f05ea0a](https://github.com/Cognis-Labs-HQ/Cognis/commit/f05ea0a48325a7a1e58ea22ca46c613f7cd85b87)

## Satu pemberitahuan luring

Status luring dan rincian halaman yang tidak tersedia digabungkan dalam satu pemberitahuan header tanpa tindakan Tutup. Setelah koneksi pulih, pemberitahuan menampilkan pesan pemulihan dan satu tombol Muat Ulang dengan varian tombol serta jarak tindakan bersama. Gaya bawaan kerangka aplikasi mempertahankan gaya tombol konfirmasi, pembatalan, dan netral yang dipilih secara eksplisit. Halaman tanpa header menggunakan satu pemberitahuan dalam konten.

Implementasi: [9cfab80](https://github.com/Cognis-Labs-HQ/Cognis/commit/9cfab806b213cc6b48525e22ddd6b7fee8677ed4)

## Aset luring dan Kalender

Resolusi aset produksi kini mencakup array, termasuk skrip kapabilitas rute dan stylesheet. URL aset publik dengan dan tanpa versi menggunakan kunci cache pekerja yang sama, sementara batas revisi modul tetap terjaga. Dua pekerja latar belakang menyiapkan kode halaman yang didukung dan gaya yang tidak aktif tanpa memasang halaman. Tautan luring memerlukan kode yang siap serta snapshot akun/sesi yang diperlukan pemiliknya. Penggambaran ulang navigasi mempertahankan status nonaktif sehingga Meetings tetap dinonaktifkan. API privat dan HTML terautentikasi tetap tidak masuk cache pekerja.

Setelah autentikasi terverifikasi, Calendar menyimpan daftar kalender, undangan, dan acara milik pengguna dengan paling banyak dua permintaan latar belakang sekaligus. Invalidasi cache memperbarui snapshot tanpa menunda login. Acara tersimpan tetap dapat dibaca; pembuatan, perubahan, penghapusan, respons, preferensi status, dan perubahan kalender masuk ke outbox bersama. Acara baru dan perubahan yang tertunda terlihat dalam daftar tersimpan. Pembuatan menggunakan UUID operasi yang stabil; pengiriman ulang mengembalikan acara yang ada tanpa menggandakan rangkaian atau mengirim ulang undangan. Penggunaan ulang dengan isi berbeda atau akun lain ditolak. Server memeriksa otorisasi saat pengiriman ulang.

Snapshot kalender hanya berada dalam tab dan dibatasi 4 MB/100 pembacaan. Outbox global tetap dibatasi 1 MB/1.000 catatan/tujuh hari. Acara berulang baru menampilkan kejadian pertama hingga server membuat rangkaiannya. Pembuatan kalender, pembuatan rapat, pengelolaan berbagi/kata sandi, dan kredensial tamu memerlukan koneksi; kata sandi berbagi tidak pernah masuk buffer. Messages memerlukan daftar ruang tersimpan dan Study memerlukan metadata bahasa/preferensi tersimpan sebelum navigasi luring diaktifkan.

Setelah autentikasi terverifikasi, Study menyiapkan katalog bahasa, preferensi, dan tautan modul bahasa yang dipilih di latar belakang, dengan paling banyak dua permintaan modul sekaligus. Subnavigasi menggunakan cache milik penyedia yang sama sehingga kunjungan pertama ke hub dapat dilakukan secara luring. Pembatalan cache menjadwalkan persiapan ulang tanpa menghambat login.

## Login dan pengiriman tertunda

Setelah login kata sandi atau TFA berhasil, kapabilitas navigasi SPA yang sudah ada mengganti halaman login dengan Dashboard. Tab terverifikasi dan perubahan tertunda tetap tersedia tanpa memicu peringatan penutupan halaman dari browser. Indikator pemuatan tetap terlihat sampai navigasi selesai; sinkronisasi zona waktu opsional berjalan sesudahnya dan menolak pergantian akun. Peringatan tetap melindungi perubahan yang benar-benar tertunda saat tab terautentikasi ditutup atau dimuat ulang.

Pengiriman ulang dimulai di latar belakang hanya setelah otorisasi sesi dan persetujuan wajib berhasil. Kunci pengiriman browser terpisah mengurutkan pengiriman antar-tab; kunci penyimpanan singkat melindungi snapshot dan konfirmasi tanpa menunggu jaringan. Pembacaan dan perubahan tertunda baru tetap berjalan selama pengiriman lambat. Konfirmasi membaca ulang penyimpanan agar perubahan bersamaan tetap tersimpan. Antrean kosong tidak ditulis ulang saat autentikasi; halaman tanpa autentikasi tidak memperingatkan tentang buffer akun lain.

## Pemeriksaan dan peringatan

Tombol Periksa Ulang Koneksi pada banner Mode Luring segera memanggil `/api/v1/system/healthcheck`, menggabungkan pemeriksaan bersamaan, lalu mengotorisasi ulang sesi dan mencoba mengirim antrean jika server terjangkau. Persetujuan wajib tetap diperlukan. Kegagalan mempertahankan Mode Luring tanpa popup kesalahan. Tombol memakai gaya bersama dan indikator sibuk; Muat Ulang tersedia setelah pemulihan. Pemeriksaan otomatis tetap sekali setiap lima belas menit, sedangkan tindakan eksplisit dapat dilakukan lebih awal.

Analitik latar belakang tetap diantrekan tetapi tidak mengaktifkan peringatan penutupan. Pemilik memilih `offline:outbox.register(owner, send, signal, { protectOnClose: false })`; nilai bawaan tetap melindungi perubahan pengguna. Rekaman baru menyimpan klasifikasinya agar pelepasan penyedia dan muat ulang tidak menganggap telemetri sebagai edit. Rekaman lama memakai deklarasi pemilik aktif; pemilik tak dikenal tetap dilindungi. Sinkronisasi zona waktu otomatis memakai `saveUiPreferences(patch, { bufferOffline: false })`; klien HTTP berskop menolaknya saat luring alih-alih mengantrekannya. Pengaturan eksplisit, pesan, dan edit Kalender tetap diantrekan dan memicu peringatan.

## Komit

- [bfc96cb](https://github.com/Cognis-Labs-HQ/Cognis/commit/bfc96cbe42c045aa334dedb15f9991c41fa146a2)
- [980643a](https://github.com/Cognis-Labs-HQ/Cognis/commit/980643a2d392559194e361745e7aae10f04c7bf2)
- [9e208d3](https://github.com/Cognis-Labs-HQ/Cognis/commit/9e208d34f2a8b9b117c4029e7a26c712efc11dd5)
- [39bc5c3](https://github.com/Cognis-Labs-HQ/Cognis/commit/39bc5c3c81a7b87b096d8ed665aa3ddeee7e4c93)
- [5cfeb11](https://github.com/Cognis-Labs-HQ/Cognis/commit/5cfeb11f0684d87760f8cc697bd42df4fcdd72b9)
- [f9e9412](https://github.com/Cognis-Labs-HQ/Cognis/commit/f9e94123bf209c424d03113bd35a4b6eb307163f)
- [7fe3dfe](https://github.com/Cognis-Labs-HQ/Cognis/commit/7fe3dfe17d68047602ae510a892503e7f0bbdc5e)
- [09ca5a5](https://github.com/Cognis-Labs-HQ/Cognis/commit/09ca5a58239ff2a21195d9b3f8d755c64753d977)
- [950309c](https://github.com/Cognis-Labs-HQ/Cognis/commit/950309c0c732d732f3558c8f153b697214378cc2)
- [5e3abf8](https://github.com/Cognis-Labs-HQ/Cognis/commit/5e3abf80c5046e5e9f783ce8900f84506cac817f)
- [a087357](https://github.com/Cognis-Labs-HQ/Cognis/commit/a087357f0eed1acfa938fa449c92ea5fd7ef63b3)
- [9ddc4fb](https://github.com/Cognis-Labs-HQ/Cognis/commit/9ddc4fb3086075e50448928439eb30d543a3dd0d)
- [9cfab80](https://github.com/Cognis-Labs-HQ/Cognis/commit/9cfab806b213cc6b48525e22ddd6b7fee8677ed4)
- [da5a324](https://github.com/Cognis-Labs-HQ/Cognis/commit/da5a324b48014feab2905dfc8a69a2cab4dd3599)
- [d895d67](https://github.com/Cognis-Labs-HQ/Cognis/commit/d895d67d17cdc3888f665a5ea06395fe746d2e2b)
