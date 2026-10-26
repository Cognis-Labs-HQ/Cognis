# Fitur Platform

## Ikhtisar

Cognis adalah platform belajar bahasa yang di-hosting sendiri yang menggabungkan konten pembelajaran terstruktur dengan fitur sosial, autentikasi yang dapat dipasang, persistensi fleksibel, dan lapisan kesiapan kolaborasi real-time.

## Kemampuan Inti

- **Autentikasi dan identitas** — adapter autentikasi yang dapat dipasang mendukung kredensial lokal, layanan direktori LDAP, SAML 2.0, dan penyedia OAuth2/OIDC.
- **Pengiriman konten bahasa modular** — sistem modul memungkinkan unit kurikulum dikemas sebagai modul dan diinstal saat runtime.
- **Halaman UI yang dapat dikonfigurasi** — setiap halaman menggunakan `createPageComposer` untuk slot tata letak yang dapat digunakan ulang dan persistensi preferensi per pengguna.
- **Jaringan sosial ringan** — profil publik, postingan bergaya microblog, grafik follower/following, dan manajemen pemblokiran.
- **Arsitektur API-first** — setiap fitur dapat diakses melalui API HTTP berversi dengan amplop respons `{ data }` / `{ error }` yang stabil.

## Mode Pembelajaran

- **Pelajar mandiri** mengerjakan konten bahasa modular dengan kecepatan mereka sendiri.
- **Guru dan tutor** membimbing sesi dengan peran `teacher`.
- **Komunitas** mengorganisir ritme belajar bersama menggunakan fitur sosial.

## Cakupan Adapter

| Area             | Adapter Bawaan                  |
| ---------------- | ------------------------------- |
| Database         | `memory`, `mariadb`, `postgres` |
| Autentikasi      | `local`, `ldap`, `saml`, `oidc` |
| Penyimpanan file | `local`                         |
| Notifikasi       | `smtp`                          |

## Pendaftaran dan Pencarian

Administrasi menyimpan izin pendaftaran akun lokal publik secara terpisah dari adapter pendaftaran. Aktifkan adapter publik dan nonaktifkan pendaftaran lokal untuk mengizinkan pembuatan akun SSO tanpa membuka pendaftaran nama pengguna/kata sandi publik. Menonaktifkan adapter juga menutup jalur pembuatan tersebut; token undangan tetap tersedia melalui adapternya sendiri. Pencarian global menampilkan hasil parsial, membatalkan kueri yang diganti, dan membatasi waktu penyedia pencarian. Judul dokumentasi muncul sebelum isi; empat pekerja yang dapat dibatalkan mengindeks isi dokumen alih-alih mengambil seluruh pustaka sekaligus.

## Koneksi dan Akun

Kebijakan pekerja luring dan metadata rute menggunakan cache kontrol terpisah. Permintaan katalog digabungkan, perubahan kebijakan mempertahankan urutan, port pesan ditutup, dan pembersihan aset di latar belakang tidak menunda balasan. Instalasi mengambil paling banyak empat aset sekaligus. Login tidak menunggu pemeliharaan cache publik dan menampilkan roda pemuatan bersama selama permintaan kredensial, kode TFA, dan otorisasi SSO. Penyiapan interaktif tetap dapat digunakan. Pemeriksaan keterjangkauan membalas dengan cepat; pemeriksaan komponen terperinci tetap di `/api/v1/system/health`.

Administrator dan pemilik dapat membuka `/invite` tanpa status pendiri. Kebijakan undangan tetap mengatur penerbitan. Adapter Token Pendaftaran yang aktif menyediakan `cognisctl invite:token:generate` untuk membuat token mandiri tanpa pengiriman SMTP, dan `cognisctl invite:email:send person@example.com` untuk mengirim undangan. Tanpa argumen email, panduan masukan CLI dibuka. Kedua perintah menggunakan API pendaftaran terautentikasi serta mematuhi pembatasan peran, domain, dan pengiriman.

## Tata Letak Daftar Pengguna

Daftar Pengguna memakai seluruh lebar composer yang tersedia. Setiap akun menjadi satu baris yang dapat dibuka, dengan identitas, peran, status, dan kontrol pengelolaan di bagian kepala; metadata yang diperluas memenuhi lebar baris di bawahnya. Detail memakai kisi label dan nilai yang responsif, nama peran dan penyedia yang dilokalkan, serta baris email terpisah dengan penanda utama dan verifikasi. Pada layar kecil, kontrol kepala membungkus dan metadata tampil dalam satu kolom.

## Privasi akun dan isolasi keyring

Akun SSO menggunakan ID acak yang tidak mengungkap identitas penyedia. ID penyedia disimpan terpisah dan hanya ditampilkan kepada administrator; nama pengguna publik tidak memuatnya. Auth mencadangkan nama sebelum perubahan profil atau email: nama duplikat dari penyedia yang sama ditolak, sedangkan penyedia berbeda mendapat akhiran acak pendek bila perlu. Daftar pengguna dan endpoint tindakan membedakan `username` publik dari `accountId` internal.

Akun lokal yang sudah ada tetap berfungsi meskipun ada catatan SSO lama. Startup tidak memerlukan reset basis data. Login dan provisi akun SSO lama ditolak secara individual sampai akun tersebut dibuat ulang dengan ID opak. ID akun, hubungan, dan rapat tidak dimigrasikan atau dihapus secara otomatis.

Status terbuka bertahan saat halaman dimuat ulang dalam tab dan sesi terautentikasi yang sama. Kata sandi tetap mengenkripsi brankas; kata sandi maupun kunci dekripsi dalam teks biasa tidak disimpan. Penyimpanan sesi hanya memuat data buka kunci terenkripsi AES-GCM, dibungkus dengan kunci HKDF dari rahasia sesi aktif dan diikat pada origin, akun, instans akun server, serta identitas sesi. Server harus memverifikasi ikatan itu sebelum pemulihan. Batas waktu penguncian diautentikasi dan tetap absolut saat muat ulang. Kunci eksplisit, logout, perubahan akun/instans/sesi, dan kedaluwarsa membatalkan pemulihan. Menutup tab atau memulai sesi baru memerlukan buka kunci lagi. Cache IndexedDB lama yang menyimpan kunci tanpa enkripsi tetap dinonaktifkan.

## Status offline dan pemulihan navigasi

Satu pemberitahuan header yang tetap terlihat menggunakan gaya callout bersama untuk menampilkan mode offline. Setelah tersambung kembali, tersedia tombol Muat Ulang tanpa pemuatan ulang otomatis; tindakan tetap menghormati perubahan yang belum disimpan atau masih dalam antrean. Halaman yang tidak tersedia terlebih dahulu mencoba memulihkan halaman sebelumnya. Jika gagal, pemuatan ulang otomatis yang dilindungi diaktifkan saat koneksi pulih. Tautan absolut dan relatif dari origin yang sama menggunakan router SPA. Katalog offline mempertahankan halaman publik dalam cache dan rute privat yang diizinkan penyedia.

## Batas polling offline

Mode Offline menghentikan polling persetujuan dan pemulihan biasa. Hanya satu pemeriksaan kesehatan server ringan berjalan setiap lima belas menit, termasuk setelah peristiwa online browser berulang. Kegagalan pemulihan koneksi saat online memperpanjang interval hingga lima belas menit. Polling persetujuan memperpanjang interval kegagalan hingga lima menit, berhenti sepenuhnya saat offline, dan dilanjutkan setelah tersambung kembali. Persetujuan dokumen wajib yang disimpan tetap menjadi syarat akses offline.

## Koneksi terputus mendadak

Jika halaman aktif tidak dapat digunakan secara luring, host menghentikan siklus hidup halaman dan mencoba kembali ke halaman sebelumnya yang mendukung mode luring tanpa dialog kesalahan. Jika gagal, pemberitahuan header menjelaskan halaman yang tidak tersedia dan kontennya dikosongkan dan penyegaran otomatis dengan pengaman navigasi diaktifkan untuk saat koneksi pulih. Pewaktu kehadiran berhenti saat luring dan dimulai lagi setelah pemulihan. Terjemahan publik yang telah dimuat digunakan kembali dalam tab; katalog terlindungi tetap memerlukan permintaan terautentikasi.

## Akses Dashboard dan Study

Dashboard menyatakan akses luring privat yang hanya berlaku dalam sesi dan mempertahankan ringkasan akun serta acara mendatang yang tersimpan. Ekstensi Dashboard opsional yang diambil dari server dilewati saat dibuka kembali secara luring. Penyedia Study mendaftarkan rute hub dan menggunakan snapshot katalog bahasa, preferensi belajar, serta tautan modul yang terikat akun dan sesi melalui alur `study:navigation`. Pemuatan bilah navigasi menyiapkan metadata ringan hub. Explore dan kartu belajar tetap menggunakan deklarasi rute milik penyedianya; halaman yang tidak didukung tetap memakai pemulihan tanpa dialog kesalahan. Kontrol pemilihan bahasa belajar memerlukan koneksi. Membuka ulang kerangka aplikasi tidak lagi menulis preferensi tema secara otomatis. Perubahan preferensi antarmuka yang disengaja menggunakan klien Profile aktif agar dapat masuk ke buffer luringnya, dengan pemeriksaan akun saat penggabungan tertunda.

## Satu pemberitahuan luring

Status luring dan rincian halaman yang tidak tersedia digabungkan dalam satu pemberitahuan header tanpa tindakan Tutup. Setelah koneksi pulih, pemberitahuan menampilkan pesan pemulihan dan satu tombol Muat Ulang dengan varian tombol serta jarak tindakan bersama. Gaya bawaan kerangka aplikasi mempertahankan gaya tombol konfirmasi, pembatalan, dan netral yang dipilih secara eksplisit. Halaman tanpa header menggunakan satu pemberitahuan dalam konten.

## Aset luring dan Kalender

Resolusi aset produksi kini mencakup array, termasuk skrip kapabilitas rute dan stylesheet. URL aset publik dengan dan tanpa versi menggunakan kunci cache pekerja yang sama, sementara batas revisi modul tetap terjaga. Dua pekerja latar belakang menyiapkan kode halaman yang didukung dan gaya yang tidak aktif tanpa memasang halaman. Tautan luring memerlukan kode yang siap serta snapshot akun/sesi yang diperlukan pemiliknya. Penggambaran ulang navigasi mempertahankan status nonaktif sehingga Meetings tetap dinonaktifkan. API privat dan HTML terautentikasi tetap tidak masuk cache pekerja.

Setelah autentikasi terverifikasi, Calendar menyimpan daftar kalender, undangan, dan acara milik pengguna dengan paling banyak dua permintaan latar belakang sekaligus. Invalidasi cache memperbarui snapshot tanpa menunda login. Acara tersimpan tetap dapat dibaca; pembuatan, perubahan, penghapusan, respons, preferensi status, dan perubahan kalender masuk ke outbox bersama. Acara baru dan perubahan yang tertunda terlihat dalam daftar tersimpan. Pembuatan menggunakan UUID operasi yang stabil; pengiriman ulang mengembalikan acara yang ada tanpa menggandakan rangkaian atau mengirim ulang undangan. Penggunaan ulang dengan isi berbeda atau akun lain ditolak. Server memeriksa otorisasi saat pengiriman ulang.

Snapshot kalender hanya berada dalam tab dan dibatasi 4 MB/100 pembacaan. Outbox global tetap dibatasi 1 MB/1.000 catatan/tujuh hari. Acara berulang baru menampilkan kejadian pertama hingga server membuat rangkaiannya. Pembuatan kalender, pembuatan rapat, pengelolaan berbagi/kata sandi, dan kredensial tamu memerlukan koneksi; kata sandi berbagi tidak pernah masuk buffer. Messages memerlukan daftar ruang tersimpan dan Study memerlukan metadata bahasa/preferensi tersimpan sebelum navigasi luring diaktifkan.

## Login dan pengiriman tertunda

Setelah login kata sandi atau TFA berhasil, kapabilitas navigasi SPA yang sudah ada mengganti halaman login dengan Dashboard. Tab terverifikasi dan perubahan tertunda tetap tersedia tanpa memicu peringatan penutupan halaman dari browser. Indikator pemuatan tetap terlihat sampai navigasi selesai; sinkronisasi zona waktu opsional berjalan sesudahnya dan menolak pergantian akun. Peringatan tetap melindungi perubahan yang benar-benar tertunda saat tab terautentikasi ditutup atau dimuat ulang.

Pengiriman ulang dimulai di latar belakang hanya setelah otorisasi sesi dan persetujuan wajib berhasil. Kunci pengiriman browser terpisah mengurutkan pengiriman antar-tab; kunci penyimpanan singkat melindungi snapshot dan konfirmasi tanpa menunggu jaringan. Pembacaan dan perubahan tertunda baru tetap berjalan selama pengiriman lambat. Konfirmasi membaca ulang penyimpanan agar perubahan bersamaan tetap tersimpan. Antrean kosong tidak ditulis ulang saat autentikasi; halaman tanpa autentikasi tidak memperingatkan tentang buffer akun lain.

## Pemeriksaan dan peringatan

Tombol Periksa Ulang Koneksi pada banner Mode Luring segera memanggil `/api/v1/system/healthcheck`, menggabungkan pemeriksaan bersamaan, lalu mengotorisasi ulang sesi dan mencoba mengirim antrean jika server terjangkau. Persetujuan wajib tetap diperlukan. Kegagalan mempertahankan Mode Luring tanpa popup kesalahan. Tombol memakai gaya bersama dan indikator sibuk; Muat Ulang tersedia setelah pemulihan. Pemeriksaan otomatis tetap sekali setiap lima belas menit, sedangkan tindakan eksplisit dapat dilakukan lebih awal.

Analitik latar belakang tetap diantrekan tetapi tidak mengaktifkan peringatan penutupan. Pemilik memilih `offline:outbox.register(owner, send, signal, { protectOnClose: false })`; nilai bawaan tetap melindungi perubahan pengguna. Rekaman baru menyimpan klasifikasinya agar pelepasan penyedia dan muat ulang tidak menganggap telemetri sebagai edit. Rekaman lama memakai deklarasi pemilik aktif; pemilik tak dikenal tetap dilindungi. Sinkronisasi zona waktu otomatis memakai `saveUiPreferences(patch, { bufferOffline: false })`; klien HTTP berskop menolaknya saat luring alih-alih mengantrekannya. Pengaturan eksplisit, pesan, dan edit Kalender tetap diantrekan dan memicu peringatan.

## Buka kunci dan pemuatan modul

Persiapan aset rute host mendaftarkan alur dan kapabilitas cache sekali per ctx bersama. Skrip bundel dan impor sumber dari modul eksternal memakai registrasi serta status rute yang sama, sehingga membuka Meetings tidak lagi gagal akibat duplikasi alur `offline:prepareRouteAssets`.

## Banner atas bersama

Host menyediakan `ctx.capabilities.get("ui:broadcast").publish(id, descriptor, { signal, priority })` sebelum halaman atau penyedia dipasang. Deskriptor menerima `title` berupa teks biasa, `bodyHtml` yang disanitasi, `actionsHtml` tepercaya, serta varian `info`, `success`, `warning`, atau `danger`. Hasilnya memiliki `element` dan `remove()`. ID yang sama hanya mengganti pemberitahuan pemiliknya; pembersih lama tidak menghapus penggantinya. Ikat masa hidup dengan `signal`; prioritas lebih kecil tampil dahulu. Judul di-escape dan pemanggil wajib menyanitasi teks kaya.

Mode Luring dan Broadcast memakai satu tumpukan lengket di bagian paling atas dokumen, di atas header aplikasi. Mode Luring mendapat prioritas, tidak dapat ditutup, dan tetap menyediakan Periksa Ulang Koneksi serta Muat Ulang setelah pulih. Menghapus pengumuman tidak menghapus Mode Luring. Broadcast melewati permintaan jaringan saat terputus; penyedianya membersihkan banner dan pengatur waktu ketika dilepas.

## Halaman Study luring kosong

Halaman Study yang sudah disiapkan tetap dapat dibuka dalam sesi luring terverifikasi dengan persetujuan wajib meskipun snapshot konten privat belum ada. Metadata bahasa atau preferensi yang hilang menghasilkan navigasi kosong. Explore memasang tampilan kosong normal dan menampilkan “Tidak ada konten luring tersimpan yang tersedia” alih-alih kesalahan rute atau toast kesalahan. Flashcards juga mempertahankan halaman kosong jika data dek atau sumber tampilan wajib belum tersedia. Pemberitahuan terikat halaman saat ini dan tidak diduplikasi. Kekurangan cache tidak menyembunyikan penolakan akses atau persetujuan. Library dan Flashcards menyiapkan terjemahan publik serta templat ringan saat daring; data privat tetap berada dalam cache tab yang dibatasi.

## Pemuatan Langsung dan Gaya

Pemuatan langsung dan penyegaran mempertahankan gaya halaman saat aset luring disiapkan. Build host dan komponen mempertahankan identitas sumber lembar gaya, dan URL logis serta URL hasil build berbagi kepemilikan. Respons aset tidak lagi menunggu penulisan cache di latar belakang; kegagalan dicatat tanpa menunda pengiriman. Font web dimuat terpisah dari tema, sehingga server font yang tidak tersedia tidak menghalangi halaman atau indikator pemuatan. Font pilihan tetap diterapkan saat tersedia, dengan font pengganti browser yang sudah ada selama pemuatan.

## Aset Study Luring

Study menyiapkan ikon popup, templat gambar, gaya gambar, dan ikon tutup saat daring tanpa membuka papan gambar atau menghalangi login. Persiapan dicoba kembali setelah koneksi pulih dan berhenti bersama penyedianya. Karakter yang sudah tersimpan dapat membuka papan gambar untuk pertama kali saat luring. Penyuntingan konten tidak tersedia saat luring; popup detail yang terbuka menonaktifkan Sunting ketika koneksi hilang. Ikon popup dekoratif yang tidak tersedia mempertahankan label tindakan terjemahannya tanpa membuka dialog kesalahan sumber daya.

## Hasil Antrean Tersimpan

Setelah perubahan disimpan dalam antrean, kegagalan pencatatan aktivitas opsional atau penyegaran tampilan tidak mengubahnya menjadi perubahan gagal. Kalender membuka detail dari daftar acara tersimpan, termasuk acara baru dalam antrean dan suntingan berikutnya. Pengiriman acara bersamaan berbagi satu permintaan. Pesan hanya menghapus draf setelah pengakuan server atau penyimpanan; kegagalan penyegaran ruang tidak membatalkan bukti tersebut. Teks profil, postingan, dan gambar juga mempertahankan hasilnya jika penyegaran tampilan gagal. Penyegaran ketersediaan tidak menghambat perubahan Kalender yang sudah selesai.

Kegagalan siklus hidup penyedia kini mencatat jalur skrip tanpa data kueri dan tahap impor atau pemasangan yang gagal. Kegagalan aktivitas opsional dicatat terpisah dari tindakan pengguna yang telah disimpan.

## Ketersediaan Luring

Registri rute luring bertahan pada impor berulang dari bundel maupun berkas langsung. Deskriptor rute yang dibentuk ulang mempertahankan ketersediaan jika skrip, gaya, dan penyedia kapabilitas tetap sama; aset yang berubah harus disiapkan ulang. Pesan menyiapkan daftar ruang, terjemahan, dan katalog emoji setelah login terverifikasi. Halaman dapat dibuka luring sebelum kunjungan daring pertama. Hanya ruang dan riwayat tersimpan yang dibuka otomatis; memilih riwayat yang belum tersimpan menampilkan toast informasi khusus. Explore mempertahankan koleksi tersimpan yang tersedia jika koleksi lain atau penanda sudah dilihat tidak ditemukan. Penolakan akses dan persetujuan tetap diteruskan. Tindakan banner ditempatkan langsung dalam baris tindakan bersama sehingga pergeseran vertikal bawaan hilang.

## Favorit Study Bersama

Penyedia Study menyediakan `study:favourites` dengan operasi `load`, `toggle`, dan `has` yang mengikuti masa hidup penyedia. Utilitas tampilan memakai kapabilitas ctx ini, bukan cache terpisah per pemuat. Favorit disiapkan setelah autentikasi terverifikasi, menerapkan perubahan tertunda, dan berbagi keadaan terikat akun/sesi antara Explore, kartu belajar, dan impor berulang. Jika snapshot favorit opsional belum tersedia, pilihan kosong tetap menerapkan perubahan dalam antrean tanpa menyembunyikan konten atau menampilkan toast gagal memperbarui. Pergantian akun mengosongkan pilihan yang terlihat. Penolakan akses tidak pernah dianggap sebagai cache yang tidak ditemukan.
