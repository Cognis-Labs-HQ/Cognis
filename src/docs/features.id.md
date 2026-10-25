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

Nama profil SSO publik tidak menyertakan ruang nama penyedia. Nama berawalan penyedia yang sudah ada diganti saat inisialisasi profil; benturan diberi akhiran acak. Nama yang sudah netral tetap stabil. ID akun, pemetaan identitas, kiriman, dan hubungan tidak berubah. URL profil publik berubah ketika namanya berubah. Metadata penyedia, email, dan riwayat login tetap berada di antarmuka Pengguna khusus administrator. Bagian detail tiap akun memakai gaya bagian yang dapat diciutkan dan mengambil metadata terotorisasi saat dibuka.

Administrator dan pemilik dapat membuka `/invite` tanpa status pendiri. Kebijakan undangan tetap mengatur penerbitan. Adapter Token Pendaftaran yang aktif menyediakan `cognisctl invite:token:generate` untuk membuat token mandiri tanpa pengiriman SMTP, dan `cognisctl invite:email:send person@example.com` untuk mengirim undangan. Tanpa argumen email, panduan masukan CLI dibuka. Kedua perintah menggunakan API pendaftaran terautentikasi serta mematuhi pembatasan peran, domain, dan pengiriman.
