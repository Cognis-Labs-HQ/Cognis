# Referensi Teknis

Antarmuka publik dan aturan operasional Fitur Platform.

## Antarmuka

Topik ini merupakan referensi dan tidak menyediakan titik akhir mandiri. Contoh memakai antarmuka publik komponen yang dijelaskan di bawah.

## Konfigurasi

### Pengaturan Pribadi Luring

Perilaku ini dijelaskan dalam [kontrak bersama](/docs/api/technical).

## Perilaku

### Penggantian Salinan Terbatas

Perilaku ini dijelaskan dalam [kontrak bersama](/docs/api/technical).

### Notifikasi Berdasarkan ID Akun

Perilaku ini dijelaskan dalam [kontrak bersama](/docs/api/technical).

### Ikhtisar

Cognis adalah platform belajar bahasa yang di-hosting sendiri yang menggabungkan konten pembelajaran terstruktur dengan fitur sosial, autentikasi yang dapat dipasang, persistensi fleksibel, dan lapisan kesiapan kolaborasi real-time.

### Kemampuan Inti

- **Autentikasi dan identitas** — adapter autentikasi yang dapat dipasang mendukung kredensial lokal, layanan direktori LDAP, SAML 2.0, dan penyedia OAuth2/OIDC.
- **Pengiriman konten bahasa modular** — sistem modul memungkinkan unit kurikulum dikemas sebagai modul dan diinstal saat runtime.
- **Halaman UI yang dapat dikonfigurasi** — setiap halaman menggunakan `createPageComposer` untuk slot tata letak yang dapat digunakan ulang dan persistensi preferensi per pengguna.
- **Jaringan sosial ringan** — profil publik, postingan bergaya microblog, grafik follower/following, dan manajemen pemblokiran.
- **Arsitektur API-first** — setiap fitur dapat diakses melalui API HTTP berversi dengan amplop respons `{ data }` / `{ error }` yang stabil.

### Mode Pembelajaran

- **Pelajar mandiri** mengerjakan konten bahasa modular dengan kecepatan mereka sendiri.
- **Guru dan tutor** membimbing sesi dengan peran `teacher`.
- **Komunitas** mengorganisir ritme belajar bersama menggunakan fitur sosial.

### Cakupan Adapter

| Area             | Adapter Bawaan                  |
| ---------------- | ------------------------------- |
| Database         | `memory`, `mariadb`, `postgres` |
| Autentikasi      | `local`, `ldap`, `saml`, `oidc` |
| Penyimpanan file | `local`                         |
| Notifikasi       | `smtp`                          |

### Pendaftaran dan Pencarian

Administrasi menyimpan izin pendaftaran akun lokal publik secara terpisah dari adapter pendaftaran. Aktifkan adapter publik dan nonaktifkan pendaftaran lokal untuk mengizinkan pembuatan akun SSO tanpa membuka pendaftaran nama pengguna/kata sandi publik. Menonaktifkan adapter juga menutup jalur pembuatan tersebut; token undangan tetap tersedia melalui adapternya sendiri. Pencarian global menampilkan hasil parsial, membatalkan kueri yang diganti, dan membatasi waktu penyedia pencarian. Judul dokumentasi muncul sebelum isi; empat pekerja yang dapat dibatalkan mengindeks isi dokumen alih-alih mengambil seluruh pustaka sekaligus.

### Koneksi dan Akun

Kebijakan pekerja luring dan metadata rute menggunakan cache kontrol terpisah. Permintaan katalog digabungkan, perubahan kebijakan mempertahankan urutan, port pesan ditutup, dan pembersihan aset di latar belakang tidak menunda balasan. Instalasi mengambil paling banyak empat aset sekaligus. Login tidak menunggu pemeliharaan cache publik dan menampilkan roda pemuatan bersama selama permintaan kredensial, kode TFA, dan otorisasi SSO. Penyiapan interaktif tetap dapat digunakan. Pemeriksaan keterjangkauan membalas dengan cepat; pemeriksaan komponen terperinci tetap di `/api/v1/system/health`.

Perilaku ini dijelaskan dalam [kontrak bersama](/docs/adapters/registration/token/technical).

### Tata Letak Daftar Pengguna

Daftar Pengguna memakai seluruh lebar composer yang tersedia. Setiap akun menjadi satu baris yang dapat dibuka, dengan identitas, peran, status, dan kontrol pengelolaan di bagian kepala; metadata yang diperluas memenuhi lebar baris di bawahnya. Detail memakai kisi label dan nilai yang responsif, nama peran dan penyedia yang dilokalkan, serta baris email terpisah dengan penanda utama dan verifikasi. Pada layar kecil, kontrol kepala membungkus dan metadata tampil dalam satu kolom.

### Status offline dan pemulihan navigasi

Satu pemberitahuan header yang tetap terlihat menggunakan gaya callout bersama untuk menampilkan mode offline. Setelah tersambung kembali, tersedia tombol Muat Ulang tanpa pemuatan ulang otomatis; tindakan tetap menghormati perubahan yang belum disimpan atau masih dalam antrean. Halaman yang tidak tersedia terlebih dahulu mencoba memulihkan halaman sebelumnya. Jika gagal, pemuatan ulang otomatis yang dilindungi diaktifkan saat koneksi pulih. Tautan absolut dan relatif dari origin yang sama menggunakan router SPA. Katalog offline mempertahankan halaman publik dalam cache dan rute privat yang diizinkan penyedia.

### Batas polling offline

Mode Offline menghentikan polling persetujuan dan pemulihan biasa. Hanya satu pemeriksaan kesehatan server ringan berjalan setiap lima belas menit, termasuk setelah peristiwa online browser berulang. Kegagalan pemulihan koneksi saat online memperpanjang interval hingga lima belas menit. Polling persetujuan memperpanjang interval kegagalan hingga lima menit, berhenti sepenuhnya saat offline, dan dilanjutkan setelah tersambung kembali. Persetujuan dokumen wajib yang disimpan tetap menjadi syarat akses offline.

### Koneksi terputus mendadak

Jika halaman aktif tidak dapat digunakan secara luring, host menghentikan siklus hidup halaman dan mencoba kembali ke halaman sebelumnya yang mendukung mode luring tanpa dialog kesalahan. Jika gagal, pemberitahuan header menjelaskan halaman yang tidak tersedia dan kontennya dikosongkan dan penyegaran otomatis dengan pengaman navigasi diaktifkan untuk saat koneksi pulih. Pewaktu kehadiran berhenti saat luring dan dimulai lagi setelah pemulihan. Terjemahan publik yang telah dimuat digunakan kembali dalam tab; katalog terlindungi tetap memerlukan permintaan terautentikasi.

### Satu pemberitahuan luring

Status luring dan rincian halaman yang tidak tersedia digabungkan dalam satu pemberitahuan header tanpa tindakan Tutup. Setelah koneksi pulih, pemberitahuan menampilkan pesan pemulihan dan satu tombol Muat Ulang dengan varian tombol serta jarak tindakan bersama. Gaya bawaan kerangka aplikasi mempertahankan gaya tombol konfirmasi, pembatalan, dan netral yang dipilih secara eksplisit. Halaman tanpa header menggunakan satu pemberitahuan dalam konten.

### Aset luring dan Kalender

Resolusi aset produksi kini mencakup array, termasuk skrip kapabilitas rute dan stylesheet. URL aset publik dengan dan tanpa versi menggunakan kunci cache pekerja yang sama, sementara batas revisi modul tetap terjaga. Dua pekerja latar belakang menyiapkan kode halaman yang didukung dan gaya yang tidak aktif tanpa memasang halaman. Tautan luring memerlukan kode yang siap serta snapshot akun/sesi yang diperlukan pemiliknya. Penggambaran ulang navigasi mempertahankan status nonaktif sehingga Meetings tetap dinonaktifkan. API privat dan HTML terautentikasi tetap tidak masuk cache pekerja.

Setelah autentikasi terverifikasi, Calendar menyimpan daftar kalender, undangan, dan acara milik pengguna dengan paling banyak dua permintaan latar belakang sekaligus. Invalidasi cache memperbarui snapshot tanpa menunda login. Acara tersimpan tetap dapat dibaca; pembuatan, perubahan, penghapusan, respons, preferensi status, dan perubahan kalender masuk ke outbox bersama. Acara baru dan perubahan yang tertunda terlihat dalam daftar tersimpan. Pembuatan menggunakan UUID operasi yang stabil; pengiriman ulang mengembalikan acara yang ada tanpa menggandakan rangkaian atau mengirim ulang undangan. Penggunaan ulang dengan isi berbeda atau akun lain ditolak. Server memeriksa otorisasi saat pengiriman ulang.

Snapshot kalender hanya berada dalam tab dan dibatasi 4 MB/100 pembacaan. Outbox global tetap dibatasi 1 MB/1.000 catatan/tujuh hari. Acara berulang baru menampilkan kejadian pertama hingga server membuat rangkaiannya. Pembuatan kalender, pembuatan rapat, pengelolaan berbagi/kata sandi, dan kredensial tamu memerlukan koneksi; kata sandi berbagi tidak pernah masuk buffer. Messages memerlukan daftar ruang tersimpan dan Study memerlukan metadata bahasa/preferensi tersimpan sebelum navigasi luring diaktifkan.

### Login dan pengiriman tertunda

Setelah login kata sandi atau TFA berhasil, kapabilitas navigasi SPA yang sudah ada mengganti halaman login dengan Dashboard. Tab terverifikasi dan perubahan tertunda tetap tersedia tanpa memicu peringatan penutupan halaman dari browser. Indikator pemuatan tetap terlihat sampai navigasi selesai; sinkronisasi zona waktu opsional berjalan sesudahnya dan menolak pergantian akun. Peringatan tetap melindungi perubahan yang benar-benar tertunda saat tab terautentikasi ditutup atau dimuat ulang.

Perilaku ini dijelaskan dalam [kontrak bersama](/docs/api/technical).

### Pemeriksaan dan peringatan

Perilaku ini dijelaskan dalam [kontrak bersama](/docs/api/technical).

Perilaku ini dijelaskan dalam [kontrak bersama](/docs/api/technical).

### Buka kunci dan pemuatan modul

Perilaku ini dijelaskan dalam [kontrak bersama](/docs/api/technical).

### Banner atas bersama

Perilaku ini dijelaskan dalam [kontrak bersama](/docs/api/technical).

Perilaku ini dijelaskan dalam [kontrak bersama](/docs/api/technical).

### Halaman Study luring kosong

Perilaku ini dijelaskan dalam [kontrak bersama](/docs/api/technical).

### Pemuatan Langsung dan Gaya

Perilaku ini dijelaskan dalam [kontrak bersama](/docs/api/technical).

### Aset Study Luring

Perilaku ini dijelaskan dalam [kontrak bersama](/docs/gateways/study/technical).

### Hasil Antrean Tersimpan

Perilaku ini dijelaskan dalam [kontrak bersama](/docs/api/technical).

Kegagalan siklus hidup penyedia kini mencatat jalur skrip tanpa data kueri dan tahap impor atau pemasangan yang gagal. Kegagalan aktivitas opsional dicatat terpisah dari tindakan pengguna yang telah disimpan.

### Ketersediaan Luring

Perilaku ini dijelaskan dalam [kontrak bersama](/docs/api/technical).

### Favorit Study Bersama

Perilaku ini dijelaskan dalam [kontrak bersama](/docs/api/technical).

### Sumber Daya Publik Tersimpan

Perilaku ini dijelaskan dalam [kontrak bersama](/docs/api/technical).

Perilaku ini dijelaskan dalam [kontrak bersama](/docs/api/technical).

### Cache Aset Persisten

Perilaku ini dijelaskan dalam [kontrak bersama](/docs/api/technical).

### Ruang Kerja Luring

Perilaku ini dijelaskan dalam [kontrak bersama](/docs/api/technical).

Perilaku ini dijelaskan dalam [kontrak bersama](/docs/api/technical).

Perilaku ini dijelaskan dalam [kontrak bersama](/docs/api/technical).

### Latihan Study Luring

Perilaku ini dijelaskan dalam [kontrak bersama](/docs/gateways/study/technical).

Perilaku ini dijelaskan dalam [kontrak bersama](/docs/api/technical).

### Kartu Kilas Disiapkan

Perilaku ini dijelaskan dalam [kontrak bersama](/docs/api/technical).

### Orbitron Luring

Perilaku ini dijelaskan dalam [kontrak bersama](/docs/api/technical).

### Banner Atas yang Dapat Diatur

Perilaku ini dijelaskan dalam [kontrak bersama](/docs/api/technical).

### Transisi dan Navigasi Lancar

Perilaku ini dijelaskan dalam [kontrak bersama](/docs/api/technical).

### Umpan Balik Luring Konsisten

Perilaku ini dijelaskan dalam [kontrak bersama](/docs/api/technical).

### Tujuan Luring Tetap Terlihat

Perilaku ini dijelaskan dalam [kontrak bersama](/docs/gateways/study/technical).

### Perubahan Bahasa UI Langsung

Perilaku ini dijelaskan dalam [kontrak bersama](/docs/api/technical).

Perilaku ini dijelaskan dalam [kontrak bersama](/docs/api/technical).

### Lebih Sedikit Permintaan

Perilaku ini dijelaskan dalam [kontrak bersama](/docs/api/technical).

### Perlindungan Keluar Luring

Tombol Keluar tetap terlihat tetapi dinonaktifkan dalam Mode Offline, dengan gaya yang sama seperti tujuan menu yang tidak tersedia. Tombol kembali aktif setelah koneksi pulih. Aktivasi saat luring tidak dapat memulai proses keluar atau menghapus sesi lokal sebelum token sesi dapat dibatalkan di server.

### Batas Sesi dan Komponen

Hanya mutasi identik yang berurutan dari pemilik pengiriman yang sama yang diabaikan. Perbedaan metode, jalur, jenis media, atau operasi di antaranya tetap mempertahankan urutan. Antrean luring dan pengiriman ulang memerlukan kapabilitas Auth `session:isOfflineValid` serta persetujuan terkini. Kapabilitas ini memeriksa kesiapan penyiapan yang telah diverifikasi, akun, token, dan kedaluwarsa sesi tanpa permintaan jaringan, termasuk setelah menunggu kunci penyimpanan. Jika kontrak Auth tidak tersedia, akses ditolak. Pengaturan memasang kontrol akun sebelum memuat email opsional; menonaktifkan Notify menyembunyikan pengelolaan email tanpa mengganggu Arsipkan, Nonaktifkan, dan Hapus. Pengguna dan Administrasi memakai kapabilitas Notify dengan cakupan siklus hidup, bukan impor UI konkret. Notify menyediakan pembacaan email administratif, pengiriman ulang khusus daring, dan ketersediaan SMTP; metadata email yang tidak tersedia ditampilkan sebagai tidak diketahui. Auth melewati penyiapan akun biasa untuk sesi tamu alternatif dan menggunakan kapabilitas klasifikasi Share untuk mengecualikan tamu berbagi pada batas server. Penyiapan email dan TFA untuk akun nyata tetap diwajibkan.

### Antrean Terikat Akun

Perilaku ini dijelaskan dalam [kontrak bersama](/docs/api/technical).

### Favorit yang Dikonfirmasi

Perilaku ini dijelaskan dalam [kontrak bersama](/docs/api/technical).

### Penggunaan Emoji Terpisah

Perilaku ini dijelaskan dalam [kontrak bersama](/docs/api/technical).

### Menu Pengguna Berbasis Akun

Perilaku ini dijelaskan dalam [kontrak bersama](/docs/api/technical).

### Aset Cache Lengkap

Perilaku ini dijelaskan dalam [kontrak bersama](/docs/api/technical).

## Keamanan

### Privasi akun dan isolasi keyring

Perilaku ini dijelaskan dalam [kontrak bersama](/docs/adapters/auth/local/technical).

Perilaku ini dijelaskan dalam [kontrak bersama](/docs/adapters/auth/local/technical).

Perilaku ini dijelaskan dalam [kontrak bersama](/docs/api/technical).

### Akses Dashboard dan Study

Dashboard menyatakan akses luring privat yang hanya berlaku dalam sesi dan mempertahankan ringkasan akun serta acara mendatang yang tersimpan. Ekstensi Dashboard opsional yang diambil dari server dilewati saat dibuka kembali secara luring. Penyedia Study mendaftarkan rute hub dan menggunakan snapshot katalog bahasa, preferensi belajar, serta tautan modul yang terikat akun dan sesi melalui alur `study:navigation`. Pemuatan bilah navigasi menyiapkan metadata ringan hub. Explore dan kartu belajar tetap menggunakan deklarasi rute milik penyedianya; halaman yang tidak didukung tetap memakai pemulihan tanpa dialog kesalahan. Kontrol pemilihan bahasa belajar memerlukan koneksi. Membuka ulang kerangka aplikasi tidak lagi menulis preferensi tema secara otomatis. Perubahan preferensi antarmuka yang disengaja menggunakan klien Profile aktif agar dapat masuk ke buffer luringnya, dengan pemeriksaan akun saat penggabungan tertunda.

## Referensi

### Salinan Preferensi Terkonfirmasi

Perilaku ini dijelaskan dalam [kontrak bersama](/docs/api/technical).
