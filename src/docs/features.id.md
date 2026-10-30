# Fitur Platform

## Penggantian Salinan Terbatas

Penggantian yang berhasil tetapi melebihi batas byte cache baca atau tidak memiliki nilai yang dapat diserialkan menghapus salinan lama agar data usang tidak tersedia saat luring. Pembacaan gabungan yang terlambat tidak dapat mengisi ulang salinan tersebut. Kunci cache lain tetap tersedia, dan respons terlalu besar tetap dapat digunakan daring tanpa disimpan.

## Notifikasi Berdasarkan ID Akun

Notifikasi berdasarkan peran serta notifikasi permintaan dan konten Study Library menggunakan `accountId` yang tetap. Pengiriman tetap menjangkau pengguna SSO dengan nama pengguna publik yang berbeda. Keputusan permintaan mengecualikan akun pelaku berdasarkan ID yang sama; nama pengguna publik tetap menjadi data tampilan.

## Salinan Preferensi Terkonfirmasi

Penulisan preferensi Profile yang berhasil memperbarui salinan baca terbatas milik penyedia sebelum pembacaan berikutnya, termasuk pengiriman ulang dan penyimpanan khusus daring. Penggabungan preferensi luring mempertahankan bidang terkonfirmasi dan menerapkan perubahan yang masih tertunda. Pembacaan terlambat tidak menimpa salinan terkonfirmasi yang lebih baru; pergantian akun, penghentian penyedia, dan penulisan gagal tidak menerbitkan data usang.

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

Peringatan tutup atau muat ulang bawaan hanya melindungi catatan baru dari halaman dan sesi saat ini. Setelah muat ulang sebenarnya, peringatan direset sementara antrean tetap disimpan untuk pengiriman ulang. Perubahan nyata yang baru mengaktifkannya lagi. Penanda Study yang dilihat dan analitik adalah aktivitas latar belakang tanpa peringatan. Catatan tab lain, catatan tersimpan sebelumnya, dan sekadar merender halaman tidak memicu peringatan. Penghentian penyedia tetap melindungi perubahan halaman saat ini sampai terkirim atau dihapus.

## Buka kunci dan pemuatan modul

Persiapan aset rute host mendaftarkan alur dan kapabilitas cache sekali per ctx bersama. Skrip bundel dan impor sumber dari modul eksternal memakai registrasi serta status rute yang sama, sehingga membuka Meetings tidak lagi gagal akibat duplikasi alur `offline:prepareRouteAssets`.

## Banner atas bersama

Host menyediakan `ctx.capabilities.get("ui:broadcast").publish(id, descriptor, { signal, priority })` sebelum halaman atau penyedia dipasang. Deskriptor menerima `title` berupa teks biasa, `bodyHtml` yang disanitasi, `actionsHtml` tepercaya, serta varian `info`, `success`, `warning`, atau `danger`. Hasilnya memiliki `element` dan `remove()`. ID yang sama hanya mengganti pemberitahuan pemiliknya; pembersih lama tidak menghapus penggantinya. Ikat masa hidup dengan `signal`; prioritas lebih kecil tampil dahulu. Judul di-escape dan pemanggil wajib menyanitasi teks kaya. Banner bersama di bagian atas mempertahankan latar buram yang mengikuti tema saat menggulir. Pemberitahuan koneksi pulih, peringatan, dan bahaya menggunakan warna tema yang tersedia.

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

## Sumber Daya Publik Tersimpan

Gaya bersama, termasuk toast dan kontrol visibilitas rahasia, disertakan dalam manifes awal worker dalam bentuk URL logis dan hasil build. Calendar menyiapkan lembar gaya status yang dimuat tertunda melalui penyedianya. Katalog rute SPA dibagikan melalui ctx antara impor bundel dan berkas langsung sehingga rute Study yang diizinkan tetap tersedia saat pemuat lain pertama kali membaca katalog secara luring. Cuplikan halaman privat tetap terikat akun dan sesi; pemeriksaan izin serta persetujuan tetap berlaku.

Aset publik tersimpan langsung dikembalikan. Pemeriksaan latar belakang sesuai permintaan digabungkan dan dibatasi. Isi respons lengkap dibandingkan sebelum penggantian; data yang tidak berubah dipertahankan. Respons dengan tanggal Last-Modified lebih lama tidak dapat mengganti berkas yang lebih baru. Berkas hilang, kegagalan koneksi, isi terpotong, dan kegagalan penulisan cache mempertahankan berkas lengkap sebelumnya. Respons berubah menggantikannya hanya setelah penulisan cache atomik berhasil. Penolakan akses eksplisit, respons private/no-store, perubahan persetujuan, dan pencabutan akses modul tetap menerapkan kebijakan. Respons API dan dokumen terautentikasi tetap hanya melalui jaringan pada worker.

## Cache Aset Persisten

Worker menyiapkan seluruh bundel halaman publik, chunk dinamis, gaya, dan media hasil build tanpa menjalankan halaman atau mengambil data privat. Respons publik yang diambil kemudian disimpan otomatis. Aktivasi worker membawa berkas publik lengkap ke generasi baru sebelum menghapus penyimpanan lama; hanya revisi modul yang diizinkan katalog saat ini yang dapat dipertahankan. Bundel publik dapat diunduh tanpa kunjungan halaman. Konten privat tetap memerlukan cuplikan terotorisasi yang disiapkan penyedia pemiliknya.

## Ruang Kerja Luring

Setelah masuk terverifikasi, Study menyiapkan skema, lokasi yang dapat dibaca, formulir, penanda dilihat, dan koleksi ringan yang diizinkan untuk bahasa belajar serta mengajar yang diikuti. Flashcards menyiapkan setiap dek yang terlihat dalam bahasa belajar atau mengajar yang diikuti, menggunakan dua worker tanpa batas 80 dek. Cache khusus dibatasi 64 MB dan 10.001 pembacaan agar galeri dan koleksi dek biasa dapat disimpan bersama; koleksi lebih besar tetap tunduk pada batas tersebut. Bahasa yang tidak diikuti dikecualikan. Katalog skema bersama disiapkan meskipun belum mengikuti bahasa, dan koleksi Library opsional yang tidak tersedia tidak menghalangi latihan dek yang telah disiapkan. Perubahan keikutsertaan memicu persiapan ulang. Dua worker membatasi pembacaan bersamaan; penghentian penyedia, pergantian akun, penolakan akses, dan persetujuan hukum tersimpan tetap diberlakukan. Halaman tidak perlu dikunjungi sebelumnya; cuplikan privat tetap terikat tab dan sesi terverifikasi.

Akses Profil luring memerlukan cuplikan profil sendiri yang lengkap: teks, postingan, koneksi, preferensi, serta gambar avatar dan banner terbatas. Profil pengguna lain diblokir meskipun pernah tersimpan. Administration, Modules, Users, dan Shares tetap tidak tersedia luring. Settings membuka kontrol inti lokal; perubahan font, tema, bahasa, zona waktu, dan tampilan diterapkan lokal dan diantrekan untuk server. Verifikasi email, tindakan akun, serta pengaturan tambahan yang memerlukan server tetap tidak tersedia luring.

Peringatan tutup atau muat ulang bawaan hanya melindungi catatan baru dari halaman dan sesi saat ini. Setelah muat ulang sebenarnya, peringatan direset sementara antrean tetap disimpan untuk pengiriman ulang. Perubahan nyata yang baru mengaktifkannya lagi. Penanda Study yang dilihat dan analitik adalah aktivitas latar belakang tanpa peringatan. Catatan tab lain, catatan tersimpan sebelumnya, dan sekadar merender halaman tidak memicu peringatan. Penghentian penyedia tetap melindungi perubahan halaman saat ini sampai terkirim atau dihapus.

Host menyediakan `ui:languageCatalog.load` melalui ctx dan menyiapkan katalog bahasa bersama setelah masuk terverifikasi. Katalog bahasa inti disertakan dalam kumpulan awal publik. Settings dan bilah navigasi memakai pembacaan yang sama dengan lingkup siklus hidup. Menyimpan preferensi bahasa secara luring mempertahankan halaman yang berfungsi dan menerapkan preferensi pada navigasi klien berikutnya.

## Latihan Study Luring

Pengelolaan Library serta halaman pengeditan, pencarian, dan permintaannya memerlukan koneksi. Submenu Study tetap menampilkan tautan tersebut tetapi menonaktifkannya saat luring, termasuk segera setelah koneksi terputus. Explore tetap tersedia untuk membaca konten tersimpan dan menggambar. Penyedia Library hanya mendaftarkan Explore sebagai rute sesi luring.

Persiapan bahasa yang diikuti menyimpan katalog skema bersama selain katalog tiap bahasa. Menggambar dan Flashcards dapat memakai pembacaan skema biasa tanpa kunjungan halaman daring sebelumnya. Flashcards menyiapkan terjemahan Share dan Study serta templat galeri, lalu membaca koleksi bahasa terpilih dengan permintaan berskema yang sama seperti persiapan keikutsertaan. Dek yang disiapkan dapat membuka galeri dan latihan luring. Audio, pengambilan kamus, pengeditan konten, serta pemeriksaan akses dan persetujuan tetap mengikuti pembatasan yang ada.

## Pengaturan Pribadi Luring

Proses masuk terverifikasi menyiapkan daftar email akun dan kebijakan domain tepercaya tanpa membuka Pengaturan. Penambahan, penghapusan, serta perubahan alamat utama ditampilkan secara lokal dan diantrekan melalui `notify:emailClient` serta pemilik antrean terlindungi `notify.emails`. Validasi server tetap menentukan hasil akhir. Verifikasi email, pengiriman ulang, dan tindakan siklus hidup akun memerlukan koneksi; kode, token pemantauan, dan kata sandi tidak masuk antrean. Alamat baru tetap belum terverifikasi hingga diverifikasi secara daring. Pengiriman berhasil memperbarui snapshot email; kegagalan penyegaran opsional tidak mengubah penulisan tersimpan menjadi tindakan gagal. Snapshot privat terbatas ini tetap terikat tab dan sesi.

## Kartu Kilas Disiapkan

Flashcards menyiapkan setiap dek yang terlihat dalam bahasa belajar atau mengajar yang diikuti, menggunakan dua worker tanpa batas 80 dek. Cache khusus dibatasi 64 MB dan 10.001 pembacaan agar galeri dan koleksi dek biasa dapat disimpan bersama; koleksi lebih besar tetap tunduk pada batas tersebut. Bahasa yang tidak diikuti dikecualikan. Katalog skema bersama disiapkan meskipun belum mengikuti bahasa, dan koleksi Library opsional yang tidak tersedia tidak menghalangi latihan dek yang telah disiapkan.

## Orbitron Luring

Orbitron disertakan dari Google Fonts sebagai font variabel berbobot 400–900 dengan SIL Open Font License di `src/ui/styles/fonts/OFL.txt`. Stylesheet dan berkas font masuk ke persiapan worker publik sebelum beralih luring. Aset publik tersimpan digunakan terlebih dahulu saat daring maupun luring; validasi ulang latar yang digabungkan menjaga aset yang dapat berubah tetap mutakhir. Orbitron tidak bergantung pada permintaan Google saat aplikasi berjalan. Font Google opsional lainnya dimuat terpisah sehingga tidak menunda font lokal.

## Banner Atas yang Dapat Diatur

Deskriptor `ui:broadcast.publish` menerima warna atau gradien CSS melalui `background` dan flag boolean `collapsible` dengan nilai awal false. Tipe deskriptor tidak valid dan nilai latar yang merusak deklarasi ditolak. Banner yang dapat dilipat menyusut menjadi garis berpola setinggi 2 px saat menggulir turun, terbuka saat menggulir naik, dan tetap dapat difokuskan dengan papan ketik; sorotan penunjuk atau fokus papan ketik menampilkan isi dan tindakannya. Tumpukan mempertahankan ruang dokumen saat terbuka untuk mencegah lonjakan gulir, sementara tinggi yang terlihat menggeser header dan bilah samping lekat. Banner yang tidak dapat dilipat tetap terlihat penuh. Menghapus banner terakhir melepas observer, pendengar gulir, dan pergeseran tata letak. Mode Luring memakai pola peringatan oranye-putih dan mengaktifkan pelipatan; setelah koneksi pulih, tindakan Muat Ulang tetap terlindungi.

## Transisi dan Navigasi Lancar

Pemberitahuan luring memakai garis oranye-putih tipis di atas permukaan tema buram. Banner yang dapat dilipat menganimasikan tinggi pembungkus yang terpotong serta opasitas isi sambil mempertahankan ruang alaminya dalam dokumen. Ekspansi papan ketik tetap tersedia dan preferensi pengurangan gerakan menonaktifkan transisi. Aset publik, termasuk manifes web yang disiapkan saat awal, dapat memakai cache sebelum persetujuan hukum; dokumen privat dan data API tetap mengikuti otorisasi. Jika Mode Luring dinonaktifkan secara eksplisit, jaringan tetap digunakan. Kegagalan satu sumber daya memerlukan pemeriksaan kesehatan yang gagal sebelum mengumumkan Mode Luring. Setelah terkonfirmasi, worker berhenti memeriksa hingga pemulihan menyegarkan katalognya. Navigasi Study langsung memakai snapshot sesi terverifikasi, dengan validasi gabungan paling sering setiap tiga puluh detik. Permintaan metadata awal dibatasi lima detik dan penemuan kamus opsional tiga detik. Penolakan akses resmi membatalkan snapshot, perubahan keikutsertaan atau modul membatalkan data navigasi, dan penemuan subhalaman yang gagal dapat dicoba ulang.

## Umpan Balik Luring Konsisten

Penyimpanan luring memakai pesan keberhasilan dan varian yang sama dengan penyimpanan saat terhubung. Pesan, kiriman, unggahan gambar, serta perubahan email tidak menambah pemberitahuan khusus antrean; tanda penerimaan pesan memakai tampilan normal. Kegagalan penyimpanan nyata dan perubahan yang ditolak tetap ditampilkan. Banner peringatan bersama memakai palet semantik terang dan gelap untuk permukaan amber buram, teks, batas, kontrol, serta aksen garis yang halus. Mode Luring tidak lagi menyisipkan gaya latarnya sendiri. Animasi pelipatan, perluasan melalui papan ketik, serta dukungan pengurangan gerakan tetap tersedia.

## Tujuan Luring Tetap Terlihat

Tujuan yang tidak tersedia tetap terlihat dengan gaya nonaktif yang sama pada navigasi utama, menu pengguna, dan submenu Study. Library serta tautan pengelolaan dan permintaan tetap tercantum tetapi nonaktif saat luring, lalu aktif kembali setelah terhubung. Izin Study tetap menentukan entri yang tersedia. Tautan nonaktif tidak memuat rute atau membuka pemberitahuan pemulihan, termasuk navigasi bahasa dan pengaturan Study yang membawa status halaman. Explore dan Flashcards yang tersimpan tetap dapat diakses.

## Perubahan Bahasa UI Langsung

Pintasan bahasa hanya beralih di antara bahasa UI yang diaktifkan dan menerapkan pilihan terakhir setelah dua detik melalui alur bertahap `ui:languageCatalog:select` dan `ui:redraw`. Dokumen browser, URL, riwayat, serta cache luring privat tetap dipertahankan. Edit yang belum disimpan tetap memakai penjagaan navigasi; pekerjaan usang dan kegagalan pemuatan tidak menetapkan bahasa lain. Pilihan hanya berlaku pada tab dan sesi akun aktif, tanpa mengubah keanggotaan atau urutan bahasa yang dikonfigurasi. Pengaturan tetap memakai Simpan/Buang; perubahan prioritas tersimpan juga menggambar ulang setelah dua detik. Saat luring, tabel bahasa tersedia, perpindahan antartabel, serta sinkronisasi browser dikunci; bahasa terpilih tetap dapat diurutkan dan disimpan melalui buffer preferensi normal. Terjemahan inti dan komponen publik disiapkan untuk bahasa aktif. Bahasa Inggris tetap menjadi cadangan per kunci dan kunci yang benar-benar hilang tetap gagal secara eksplisit. Worker menyiapkan seluruh XML bahasa komponen host serta SVG bendera bahasa agar halaman yang sudah disiapkan dapat digambar ulang luring tanpa kunjungan sebelumnya. Shell yang digunakan kembali dan label navigasi inti diterjemahkan ulang tanpa membongkar penyedia. Pengatur waktu dilepas bersama halaman atau penggantian pengikatnya.

Setelah penyimpanan selesai, penggambaran ulang terjadwal tetap memeriksa perubahan baru yang belum disimpan. Perubahan selama jeda dua detik tetap memerlukan konfirmasi pembuangan; penyimpanan berulang digabungkan, dan meninggalkan Pengaturan membatalkan penggambaran ulang yang tertunda.

## Lebih Sedikit Permintaan

Pembacaan aset publik berbagi unduhan yang sedang berlangsung hingga penulisan cache selesai, sehingga halaman dan penyedia yang berjalan bersamaan tidak mengunduh sumber daya yang sama berulang kali. Pembaruan worker menggunakan kembali aset host lengkap dengan hash konten dari generasi cache sebelumnya; aset yang dapat berubah tetap diperbarui dari server. Respons yang mengutamakan cache, validasi ulang bersyarat di latar belakang, pemeriksaan revisi modul, dan perilaku penonaktifan Mode Offline tetap berlaku. Katalog bahasa dan metadata navigasi Study menggunakan masa kesegaran daring tiga puluh detik, termasuk ketika Mode Offline dinonaktifkan. Setelah kedaluwarsa, data diperbarui saat dibutuhkan tanpa polling; pembaruan bersamaan digabungkan. Study mempertahankan validasi ulang latar belakang yang bergantung pada persetujuan. Pergantian akun atau sesi, kedaluwarsa, perubahan siklus hidup komponen, dan invalidasi eksplisit menghapus snapshot terkait. Pembacaan dan penulisan data pribadi lainnya tetap menggunakan pemeriksaan transportasi dan otorisasi yang ada.

## Perlindungan Keluar Luring

Tombol Keluar tetap terlihat tetapi dinonaktifkan dalam Mode Offline, dengan gaya yang sama seperti tujuan menu yang tidak tersedia. Tombol kembali aktif setelah koneksi pulih. Aktivasi saat luring tidak dapat memulai proses keluar atau menghapus sesi lokal sebelum token sesi dapat dibatalkan di server.

## Batas Sesi dan Komponen

Hanya mutasi identik yang berurutan dari pemilik pengiriman yang sama yang diabaikan. Perbedaan metode, jalur, jenis media, atau operasi di antaranya tetap mempertahankan urutan. Antrean luring dan pengiriman ulang memerlukan kapabilitas Auth `session:isOfflineValid` serta persetujuan terkini. Kapabilitas ini memeriksa kesiapan penyiapan yang telah diverifikasi, akun, token, dan kedaluwarsa sesi tanpa permintaan jaringan, termasuk setelah menunggu kunci penyimpanan. Jika kontrak Auth tidak tersedia, akses ditolak. Pengaturan memasang kontrol akun sebelum memuat email opsional; menonaktifkan Notify menyembunyikan pengelolaan email tanpa mengganggu Arsipkan, Nonaktifkan, dan Hapus. Pengguna dan Administrasi memakai kapabilitas Notify dengan cakupan siklus hidup, bukan impor UI konkret. Notify menyediakan pembacaan email administratif, pengiriman ulang khusus daring, dan ketersediaan SMTP; metadata email yang tidak tersedia ditampilkan sebagai tidak diketahui. Auth melewati penyiapan akun biasa untuk sesi tamu alternatif dan menggunakan kapabilitas klasifikasi Share untuk mengecualikan tamu berbagi pada batas server. Penyiapan email dan TFA untuk akun nyata tetap diwajibkan.

## Antrean Terikat Akun

Catatan antrean menyertakan pengenal instans akun yang diverifikasi server. Auth mengembalikan `accountInstanceId` kanonis dalam status penyiapan terautentikasi dan hanya menyediakan `session:getOfflineIdentity` untuk sesi akun yang terverifikasi, selesai disiapkan, dan belum kedaluwarsa. Ketiadaan metadata otoritatif mencabut izin luring. Tampilan antrean serta pemeriksaan penyimpanan dan pengiriman terikat pada instans ini; catatan instans lama atau tanpa ikatan ditolak sebelum dikirim, termasuk setelah akun lokal dibuat ulang dengan ID akun yang sama. ID operasi tidak bertabrakan antarinstans akun. Token Bearer tidak pernah disimpan dalam antrean.

## Favorit yang Dikonfirmasi

Perubahan favorit daring yang berhasil dan konfirmasi pengiriman ulang mengganti snapshot luring Study yang dibatasi ukurannya dengan respons server. Pembacaan lama yang masih berjalan tidak dapat menimpa snapshot tersebut. Membuka ulang halaman secara luring mempertahankan penambahan dan penghapusan yang telah dikonfirmasi, sementara perubahan yang masih mengantre tetap diproyeksikan di atas snapshot.

## Penggunaan Emoji Terpisah

Pemilih reaksi Messages yang dapat digunakan kembali mencatat frekuensi emoji secara terpisah dari perubahan reaksi. Hanya permintaan reaksi pesan yang menyertakan keadaan aktif akhir. Kegagalan pencatatan penggunaan dicatat tanpa menghalangi reaksi yang dipilih atau fungsi pembaruannya.

## Menu Pengguna Berbasis Akun

Menu tindakan Pengguna menemukan baris melalui ID akun yang tidak berubah, bukan nama pengguna publik. Akun SSO mempertahankan entri reset TFA dan status pendiri; reset kata sandi yang dikelola eksternal tetap dinonaktifkan. Pilihan lama atau tidak dikenal tidak dapat membuka tindakan akun.

## Aset Cache Lengkap

Permintaan rentang melewati cache berkas utuh, dan hanya respons HTTP 200 lengkap yang dapat mengisi atau mengganti aset publik. Respons parsial tidak mengubah data lengkap yang sudah tersedia. Berkas font dengan hash konten memakai cache tetap dan penggunaan ulang lintas generasi seperti skrip dan gambar berhash, sehingga pembaruan worker tidak mengunduh ulang berkas yang sama.
