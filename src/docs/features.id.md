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

Brankas browser terenkripsi disimpan terpisah menurut origin, ID akun, dan ID instans akun dari server. Server harus memverifikasi akun serta instans sebelum cache dimuat. Kata sandi dan kunci dekripsi hanya ada di memori; kunci pembuka IndexedDB lama dihapus. Setelah memuat ulang, kata sandi keyring diperlukan kembali, kecuali login kata sandi berhasil mendekripsi brankas. Pergantian akun membatalkan dialog dan operasi kriptografi yang tertunda. Membuka keyring tidak membuat keyring baru; pembuatan memerlukan penyiapan atau tindakan Buat secara eksplisit.

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
