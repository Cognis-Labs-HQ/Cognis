# Tutorial terpandu

**Feature Branch:** feature-guided-tutorials-stacked

Tutorial terikat pada halaman atau URL. Kunjungan pertama yang memenuhi syarat otomatis memulai tutorial halaman yang belum selesai. SVG tanda tanya di samping judul dalam `page-context` memutar ulang tutorial yang tersedia pada halaman itu. Host memiliki tampilan dan siklus hidup; fitur memiliki teks, target, dan skrip. Tutorial tidak mengubah izin.

Host mengelola tampilan, aksesibilitas, pembatasan peristiwa, pencarian target dan pembersihan siklus hidup. Contoh ruang kerja dan Study berada di komponen pemiliknya. Modul eksternal mendaftarkan alur dan target melalui ctx tanpa mengimpor implementasi internal host. Pengujian mencakup flow terdaftar, target hilang atau diganti, pembatalan asinkron, izin, pemulihan kegagalan penyedia dan handle kedaluwarsa. Pemeriksaan Chromium mencakup fokus, gulir, zoom, pembatasan papan ketik dan sentuhan, peran aksesibilitas, pengurangan gerakan dan kedua tema.

## Ikatan Halaman dan Kunjungan Awal

Semua tombol aksi tutorial berada dalam instans terpisah dari menu mengambang bersama. Sesi pertama tidak memiliki Batal atau Lewati; Escape tidak menutupnya. Berikutnya tetap tersedia saat menunggu target, pekerjaan asinkron, atau langkah berbasis peristiwa, sehingga menekannya berulang selalu menyelesaikan panduan. Pemutaran ulang menyediakan Batal dengan `btn-cancel`. Navigasi lain, riwayat, perubahan akun atau izin, pelepasan penyedia, dan dialog wajib tetap membersihkan sesi. Tutorial tidak menyetujui dialog, mengirim formulir berizin khusus, atau memulai panggilan.

## Panduan Milik Komponen

Halaman memberikan kontribusi yang ditulis melalui larik `tutorials` pada composer. Setiap kontribusi menetapkan pemilik, definisi, dan `minRole` opsional; setiap definisi memberikan halaman, teks terlokalisasi, dan selektor milik komponen. `scope` membatasi pencarian pada bagian yang terlihat. Host menerbitkan target bersiklus hidup terbatas dan mendaftar melalui `ui:tutorial:mountPage`. Pelepasan halaman membersihkan panduannya. Penyedia opsional dapat memakai `mountTutorialProvider` dari `ui:reuse` sambil tetap memiliki lokalisasi dan siklus hidupnya.

## Kunci Terjemahan Modul

Kunci tutorial mempertahankan ID modul manifes sebagai satu segmen ruang nama. Label navigasi dan pencarian umum memakai katalog bersama. Kegagalan penyiapan halaman melepaskan semua kontribusi tutorial agar halaman dapat dimuat ulang.

## Katalog Tutorial

Katalog bahasa tutorial dimuat dengan revisi berdasarkan kunci terjemahan yang dideklarasikan, terpisah dari pemuatan katalog halaman sebelumnya. Ini mencegah katalog lama dalam memori menolak teks tutorial yang baru diterbitkan. Kontrak panduan yang sama memakai kembali katalog, termasuk saat luring. Teks bahasa pilihan yang tidak tersedia memakai bahasa Inggris; kunci bahasa Inggris yang benar-benar hilang tetap menggagalkan pendaftaran dan membatalkan pemiliknya. Kunci langkah memakai nama topik, bukan urutannya.

## Geometri Sorotan Terlihat

Sorotan memakai irisan terlihat dari sasaran, leluhur yang memotong atau menggulir, dan viewport visual. Sasaran halaman menghindari header serta footer; panduan yang menargetkan kontrol tersebut tetap memakai wilayahnya sendiri. Sasaran besar yang sudah terlihat mempertahankan posisi gulir. Kotak petunjuk mencoba sisi yang tersedia sebelum ditempatkan di dalam sasaran terlihat, dengan panah di luar layar yang menyesatkan disembunyikan. Kontrol tutorial menyisihkan ruang sendiri agar teks terjemahan panjang dapat digulir tanpa menutupi tombol navigasi.

Instans menu mengambang bersama mempertahankan tema, batas, tombol, jarak, dan blur latar standarnya. Menu berada di atas peredupan tutorial, termasuk pemilih pengulangan dari judul halaman. Peredupan mengecualikan target, kontrol mengambang, dan banner siaran; panel memberi ruang di bawah banner yang terlihat. Kontrol tetap berada dalam viewport pada tema terang dan gelap.

## Kesiapan Halaman

Host menjalankan `page:ready` setelah `page:mounted`, dengan tahap `prepare`, `blocking`, `ready`, dan `afterReady`. Perenderan selesai sementara tahap pemblokiran menunggu pekerjaan awal. Penyiapan login tertunda bergabung sebelum catatan rilis. Pemilik Changelogs menunggu preferensi, permintaan metadata, dan penutupan popup sebelum kesiapan diterbitkan. Pembatalan menutup popup lama tanpa menyimpan tanda sudah dibaca. Tutorial otomatis dan pengulangan dari judul halaman tetap ditunda sampai siap. Navigasi membatalkan halaman lama sehingga pekerjaan terlambat tidak dapat menyatakan halaman pengganti siap.

Pemilik popup berikutnya dapat menambahkan pemblokir sebelum halaman dipasang melalui `registerPageReadinessBlocker` dari modul bersama `page-readiness.js`. Berikan `id` unik pemilik, `order` opsional, dan `signal` milik pemilik. Kembalikan promise yang selesai saat pemeriksaan atau popup selesai. Callback menerima `input.signal` yang menggabungkan pembatalan halaman dan pemilik. Registrasi aman diganti dan dibersihkan bersama pemiliknya. Konsumen memakai `ui:pageReadiness.isReady()` atau tahap `afterReady` untuk menunda notifikasi serta tindakan halaman lainnya.

## Kontrol Dan Teks Yang Jelas

Teks tutorial menjelaskan tugas dan kontrol yang tersedia tanpa pernyataan tidak relevan tentang izin atau tindakan yang tidak dilakukan panduan.

## Navigasi Yang Dijaga

Langkah dapat memakai `preventNavigation` untuk mempertahankan halaman saat menjelaskan kontrol navigasi. Panduan Dasbor menggunakannya di seluruh langkah. Aktivasi tautan melalui penunjuk dan papan ketik, navigasi router terprogram, serta perpindahan riwayat yang dikelola router mengikuti penjagaan ini. Berikutnya, Kembali, dan Selesai tetap tersedia; transisi rute milik tutorial diizinkan. Penjagaan berakhir bersama langkah atau sesi.

## Panduan Tugas

Cakupan mencakup 55 panduan dan 175 langkah, termasuk 22 panduan administrator. Dasbor memiliki latihan pencarian langsung: buka kontrol pencarian asli, masukkan kueri, periksa opsi dan hasil, lalu tutup pencari sebelum melanjutkan. Langkah penjelasan mencegah hover dan aktivasi yang tidak disengaja; langkah interaktif mengizinkan targetnya secara eksplisit. Panduan kontekstual muncul saat detail dek, sesi latihan, atau detail modul terlihat.

Panduan fitur mencakup memulai dan mempratinjau pesan, anggota ruang, pratinjau kiriman, navigasi kalender dan perencanaan acara, perubahan acara berulang, filter pembagian dan kedaluwarsa, undangan, filter pustaka dan perbandingan kamus, latihan audio dan menulis, favorit dan permintaan konten, pembuatan dek, umpan balik latihan, edit/bagikan/ekspor dek, pendaftaran kelas, peringkat, fon, perubahan belum disimpan, pemberitahuan rilis, pencarian akun, serta konfigurasi dan siklus hidup modul. Formulir dan konfirmasi penghapusan tetap menjadi tindakan sadar milik fitur; panduan menjelaskan titik masuknya dan mengalah pada dialog wajib.

## Panel Dan Tindakan Dasbor

Panduan Dasbor memiliki 18 langkah dan membuka panel notifikasi serta menu akun melalui penangan klik aslinya. Latihan klik mencegah hover, sedangkan penjelasan panel dan menu membiarkan tindakan penghapusan atau navigasi tidak aktif. Menu akun menjelaskan Pengaturan, Dokumentasi, tautan administrasi sesuai peran, dan Keluar. Panduan juga mencakup dok tindakan halaman, pengalihan bahasa, tampilan, dan penyuntingan tata letak.

Permukaan sementara mendaftarkan elemen, tindakan tutup, dan sinyal pemilik melalui `ui:transientSurfaces.register(element, close, signal)`. Panduan memakai `attachLifetime(element, groupSignal)` untuk melepaskan pencari, panel notifikasi, atau menu yang cocok saat grup berakhir. Klik tindakan tutorial tidak mencapai penangan klik luar di latar, sehingga menu tetap terbuka selama penjelasannya.

## Komit

- [5f3bad1422cd47085170ba2c5e4d06ca118c05fe](https://github.com/Cognis-Labs-HQ/Cognis/commit/5f3bad1422cd47085170ba2c5e4d06ca118c05fe)
- [a2d973028](https://github.com/Cognis-Labs-HQ/Cognis/commit/a2d973028ba72dcdeb296c1346b9a893ccf7a84b)
- [73d206f](https://github.com/Cognis-Labs-HQ/Cognis/commit/73d206f37913e3cf6d8a7fcf8eed31c383f811f4)
- [9bd2026](https://github.com/Cognis-Labs-HQ/Cognis/commit/9bd2026bf195a4e815b5822f968b94796b99244a)
- [1df4bc6](https://github.com/Cognis-Labs-HQ/Cognis/commit/1df4bc68d8ad108c236caaeb67e09337f9f3d169)
- [0583f247d](https://github.com/Cognis-Labs-HQ/Cognis/commit/0583f247d44676b179a70fe408804b730e73878b) — Pertahankan sorotan besar tetap terlihat dan pertegas kontrol tutorial.
- [ae593b178](https://github.com/Cognis-Labs-HQ/Cognis/commit/ae593b1781496a4985d787b32b647d95fa595547) — Koordinasikan popup awal melalui kesiapan halaman sebelum tutorial dimulai.
- [8a845efb1](https://github.com/Cognis-Labs-HQ/Cognis/commit/8a845efb1cb16a1538a80cc456c82482af4a4c0e) — Perbarui kesiapan ketika halaman dibatalkan lalu dipasang ulang pada URL yang sama.
- [e65144a29](https://github.com/Cognis-Labs-HQ/Cognis/commit/e65144a29220e5ecc0b10272bf3739716ca52094)
- [6fd10e6f5](https://github.com/Cognis-Labs-HQ/Cognis/commit/6fd10e6f5b2287cfbe47848a49b749929e0e17c6)
- [7a337d228](https://github.com/Cognis-Labs-HQ/Cognis/commit/7a337d2283f729ae121ef34d4a1becc29c394ec5)
- [a37ebad6c](https://github.com/Cognis-Labs-HQ/Cognis/commit/a37ebad6cbfe54e2e1da28144e3dc7a9ffb4e39c)
- [ce721403b](https://github.com/Cognis-Labs-HQ/Cognis/commit/ce721403ba29d74c71a8056ba58f0a25ea315cf0)

Jalur langkah mendukung `minRole`, predikat boolean sinkron `when({ firstTime, completed, skipped })`, dan `dependsOn: ["earlier-step-id"]`. Langkah tanpa izin atau dengan kondisi salah tidak masuk hitungan kemajuan. Dependensi harus menunjuk langkah sebelumnya; referensi tidak dikenal, duplikat, diri sendiri, dan langkah berikutnya ditolak. Langkah interaktif memenuhi dependensi hanya setelah peristiwa atau kondisi tunggunya berhasil. Memilih Berikutnya melewati cabang dependennya; langkah statis dipenuhi dengan Berikutnya. Kondisi menerima salinan hasil yang tidak dapat diubah. Jumlah mencerminkan jalur yang tersedia dan dapat bertambah ketika interaksi membuka cabang. Kembali menghapus hasil mulai dari tujuannya. `restart()` dan Mulai Ulang Tutorial menghapus seluruh hasil dan menutup permukaan sementara dalam sesi yang sama. Cabang Pencarian, notifikasi, dan akun memerlukan pembukaan kontrol terkait. Administrasi memerlukan `minRole: "admin"`; kontrol dok opsional disaring menurut visibilitas. Sorotan mengikuti ukuran dok aktual, termasuk bagian di bawah batas footer, sementara balon penjelasan tetap memakai area tampilan yang dicadangkan.

Tombol, tautan, dan aktivasi papan ketik pada banner tetap tersedia. Aktivasi menghentikan tutorial melalui `ui:tutorial:priority` sebelum dialog atau navigasi milik tindakan berjalan. Kontrol banner dapat dicapai dengan Tab.

`showToast(message, { minRole: "admin" })` membatasi informasi operasional kepada administrator dan pemilik. Peran lain atau tidak dikenal tidak membuat DOM toast, timer, atau callback penutupan. Tanpa `minRole`, umpan balik biasa tetap terlihat oleh semua pengguna. Opsi tampilan ini bukan otorisasi operasi server.

- [f681187ca](https://github.com/Cognis-Labs-HQ/Cognis/commit/f681187ca572fa4270f9b398d429a3d1177c62d3)
