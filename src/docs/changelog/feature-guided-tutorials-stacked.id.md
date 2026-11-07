# Tutorial terpandu

**Feature Branch:** feature-guided-tutorials-stacked

Tutorial terikat pada halaman atau URL. Kunjungan pertama yang memenuhi syarat otomatis memulai tutorial halaman yang belum selesai. SVG tanda tanya di samping judul dalam `page-context` memutar ulang tutorial yang tersedia pada halaman itu. Host memiliki tampilan dan siklus hidup; fitur memiliki teks, target, dan skrip. Tutorial tidak mengubah izin.

Host mengelola tampilan, aksesibilitas, pembatasan peristiwa, pencarian target dan pembersihan siklus hidup. Contoh ruang kerja dan Study berada di komponen pemiliknya. Modul eksternal mendaftarkan alur dan target melalui ctx tanpa mengimpor implementasi internal host. Pengujian mencakup flow terdaftar, target hilang atau diganti, pembatalan asinkron, izin, pemulihan kegagalan penyedia dan handle kedaluwarsa. Pemeriksaan Chromium mencakup fokus, gulir, zoom, pembatasan papan ketik dan sentuhan, peran aksesibilitas, pengurangan gerakan dan kedua tema.

## Ikatan Halaman dan Kunjungan Awal

Semua tombol aksi tutorial berada dalam instans terpisah dari menu mengambang bersama. Sesi pertama tidak memiliki Batal atau Lewati; Escape tidak menutupnya. Berikutnya tetap tersedia saat menunggu target, pekerjaan asinkron, atau langkah berbasis peristiwa, sehingga menekannya berulang selalu menyelesaikan panduan. Pemutaran ulang memakai Lewati untuk keluar dari panduan. Navigasi lain, riwayat, perubahan akun atau izin, pelepasan penyedia, dan dialog wajib tetap membersihkan sesi. Tutorial tidak menyetujui dialog, mengirim formulir berizin khusus, atau memulai panggilan.

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

Jalur langkah mendukung `minRole`, predikat boolean sinkron `when({ firstTime, completed, skipped })`, dan `dependsOn: ["earlier-step-id"]`. Langkah tanpa izin atau dengan kondisi salah tidak masuk hitungan kemajuan. Dependensi harus menunjuk langkah sebelumnya; referensi tidak dikenal, duplikat, diri sendiri, dan langkah berikutnya ditolak. Langkah interaktif memenuhi dependensi hanya setelah peristiwa atau kondisi tunggunya berhasil. Memilih Berikutnya melewati cabang dependennya; langkah statis dipenuhi dengan Berikutnya. Kondisi menerima salinan hasil yang tidak dapat diubah. Jumlah mencerminkan jalur yang tersedia dan dapat bertambah ketika interaksi membuka cabang. Kembali menghapus hasil mulai dari tujuannya. `restart()` dan Mulai Ulang Tutorial menghapus seluruh hasil dan menutup permukaan sementara dalam sesi yang sama. Cabang Pencarian, notifikasi, dan akun memerlukan pembukaan kontrol terkait. Administrasi memerlukan `minRole: "admin"`; kontrol dok opsional disaring menurut visibilitas. Sorotan mengikuti ukuran dok aktual, termasuk bagian di bawah batas footer, sementara balon penjelasan tetap memakai area tampilan yang dicadangkan.

Tombol, tautan, dan aktivasi papan ketik pada banner tetap tersedia. Aktivasi menghentikan tutorial melalui `ui:tutorial:priority` sebelum dialog atau navigasi milik tindakan berjalan. Kontrol banner dapat dicapai dengan Tab.

`showToast(message, { minRole: "admin" })` membatasi informasi operasional kepada administrator dan pemilik. Peran lain atau tidak dikenal tidak membuat DOM toast, timer, atau callback penutupan. Tanpa `minRole`, umpan balik biasa tetap terlihat oleh semua pengguna. Opsi tampilan ini bukan otorisasi operasi server.

Langkah overlay pencarian memakai area tampilan overlay agar header dan footer tidak memotong sorotan input. Klik pil penyempurnaan mana pun menyelesaikan latihan filter. Langkah yang memerlukan Berikutnya atau Selesai menyoroti tindakan itu dengan garis tepi beranimasi lembut; preferensi pengurangan gerakan mempertahankan garis statis. Langkah yang menunggu atau maju otomatis tidak menampilkan isyarat ini.

Setiap langkah tutorial kini menetapkan `highlightNext` secara eksplisit: penjelasan yang memerlukan Berikutnya atau Selesai mengaktifkannya, sedangkan latihan berbasis interaksi atau penantian menonaktifkannya. Pengurangan gerakan mempertahankan garis tepi statis. Semua tutorial ditinjau, termasuk hasil pencarian dan penjelasan notifikasi.

Setiap komponen antarmuka wajib dicakup tutorial. Panduan kontribusi mengharuskan alur tugas yang berfokus pada pengguna dan peninjauan tutorial setiap kali fitur atau perilaku antarmuka berubah.

Kembali dari luar grup langkah atau cabang dependensi yang selesai akan menuju pembukanya dan menghapus hasil cabang. Di dalam cabang, Kembali tetap berurutan. Ini mencegah kunjungan ulang ke panel Pencarian yang sudah ditutup lalu melompat otomatis ke akhir.

Langkah halaman dapat memakai `targetMatch: "first"` untuk memilih kecocokan pertama yang terlihat dan dapat digunakan dalam bagian yang ditetapkan. Pencocokan unik tetap menjadi bawaan. Target yang hilang atau nonaktif mengikuti kebijakan pelewatan penulis. Sorotan tindakan kini mengarah ke sakelar yang dapat diubah, pemilih peran, kuota, pengujian notifikasi, kontrol berbagi, rekaman, dan tindakan modul. Komponen menyorot sakelar daya yang dapat diubah; kontrol wajib dan tersembunyi dikecualikan.

## Wilayah tutorial dan pemulihan

Mulai Ulang Tutorial tetap menjadi tindakan pemulihan; tombol Coba Lagi tidak lagi ditampilkan. Langkah pengantar menyoroti bagian yang dirujuk, termasuk daftar rapat Jitsi kosong dan Cari Peserta. Penyedia pembelajaran memakai target bahasa Study dan ruang kerja publik yang terdaftar. `highlightNext` tetap aktif untuk penjelasan dan nonaktif untuk langkah berbasis peristiwa.

## Antrean menu mengambang bersama

Menu mengambang memakai kapabilitas `ui:floatingMenus` versi 1 dan alur bertahap `ui:floatingMenu:request`, `present`, `dismiss`, serta `release`. Prioritas sama mengikuti urutan permintaan; prioritas lebih tinggi menangguhkan menu di bawahnya. Reservasi menyediakan `ready` untuk izin pertama atau pembatalan, `present(element, { visible })`, `dismiss(element)`, dan `dispose()`. Tutorial menahan prioritas 100 sampai selesai, dibatalkan, atau pemilik dilepas, termasuk di antara langkah. Slot komposer dan pemilih pemutaran ulang memakai antrean yang sama. Permintaan batal dan tampilan lama tidak dapat menggantikan menu baru; slot kosong mengalah, dan pelepasan halaman membersihkan observer serta reservasi.

## Isyarat Berikutnya hanya dengan animasi

Isyarat Berikutnya/Selesai hanya memakai animasi berdenyut tanpa garis tepi permanen. Pengurangan gerakan menonaktifkan animasi; fokus papan ketik normal tetap terlihat.

## Target tutorial yang tepat

Balon penjelasan tetap memakai kontrol dok yang terlihat di bawah ruang menu sebagai jangkar dan menghindari menu tindakan yang sebenarnya. Langkah pemutaran ulang menyoroti tombol ? itu sendiri. Tombol mempertahankan warna teks tema selama tutorial; pemutaran ulang tidak mengganti panduan yang aktif.

## Penyelesaian bertahan setelah pembaruan

Penyelesaian terikat pada akun dan ID pemilik/tutorial yang stabil. Pembaruan isi dan paket tidak pernah mengatur ulang penyelesaian. Tutorial yang selesai hanya diulang melalui kontrol ? di judul halaman. Pertahankan ID saat merevisi panduan; penyelesaian tetap disimpan di penyimpanan peramban akun. Setiap sesi yang berhasil menyimpan penyelesaian sebelum penemuan halaman dilanjutkan, termasuk panduan yang dimulai langsung melalui handle publik penyedia.

## Tindakan keluar pemutaran ulang

Pemutaran ulang tutorial menyediakan Lewati sebagai satu-satunya tombol keluar; tombol Batal yang berlebihan dihapus. Panduan pertama mempertahankan kontrol kemajuan yang ada.

## Panduan Pengaturan Terisolasi

Langkah fon memakai teks milik Pengaturan dari katalog host. Terjemahan Kelas opsional tidak lagi diperlukan untuk mendaftarkan panduan Pengaturan. Cakupan panduan komponen berada di dokumentasi pemiliknya.

## Indentasi Katalog Konsisten

XML bahasa yang diubah PR tutorial memakai dua spasi untuk entri string. Nilai terjemahan dipertahankan; teks langkah fon dipindahkan dari Kelas ke Pengaturan dalam keempat bahasa.

## Kesiapan Saat Riwayat Dokumen

Mundur dan Maju di dalam Dokumentasi atau Riwayat Perubahan mempertahankan kesiapan halaman terpasang. Penggantian rute yang dilakukan dan pembatalan masa hidup halaman tetap membatalkannya; riwayat dokumen internal tidak mengulang pemeriksaan awal.

## Tindakan menu tutorial

Mulai Ulang Tutorial muncul setelah langkah terlihat pertama. Pemutaran ulang menyediakan Lewati sebelum langkah terlihat terakhir; langkah terakhir menyediakan Selesai. Panduan satu langkah tidak menyediakan Mulai Ulang Tutorial atau Lewati. Panduan pertama tetap tidak menyediakan Lewati.

Dokumentasikan halaman dan persyaratan akses dalam dokumentasi komponen yang sudah ada, tanpa inventaris gabungan terpisah.

## Hapus Fixture Demo Peramban

Halaman demo/peramban mandiri beserta modul skenarionya dihapus. Helper bersama untuk pengujian otomatis tetap dipertahankan.

## Kelola dek terpilih

Panduan pengelolaan memakai wadah dek terpilih sebagai batas, termasuk kontrol edit, berbagi, dan ekspor. Panduan tetap tidak tersedia dalam daftar dek.

## Perataan pemutaran ulang

Tombol ? sejajar dengan judul halaman. Tombol tidak memiliki tooltip saat diarahkan dan tetap memakai label aksesibel yang dilokalkan.

## Tombol pemutaran ulang sejajar

Tombol ? sejajar dengan judul halaman. Tombol tidak memiliki tooltip saat diarahkan dan tetap memakai label aksesibel yang dilokalkan.

## Perbaiki kontrol pemutaran ulang

Kontrol pemutaran ulang berupa ikon ringkas tanpa bingkai terlihat dengan jarak jelas dari judul halaman. Kontrol tidak memperbesar baris judul, mempertahankan warna teks tema, serta menampilkan umpan balik hover halus dan fokus papan ketik yang terlihat. Tooltip tetap tidak ditampilkan.

## Batas marketplace lengkap

Panduan marketplace mencakup bilah alat, kartu, pengaturan sumber, dan tindakan detail modul sambil mempertahankan kondisi daftar/detail.

## Pulihkan penyajian terputus

Target yang hilang saat perenderan asinkron dicari ulang sebelum kesiapan diterbitkan. Penyajian yang dimulai ulang atau dibatalkan tidak dapat melanjutkan pemulihan lama atau menahan menu mengambang.

## Kondisi visibilitas terpisah

`scope` membatasi target dan penemuan. `visibleWhen` opsional memerlukan satu elemen terlihat tanpa membatasi target ke turunannya; target tetap berada dalam akar komponen. Administrasi Pustaka memakainya untuk visibilitas browser sambil menyoroti pencarian di bilah samping. Selektor tidak valid menggagalkan registrasi dan membersihkan pemilik.

## Panduan halaman terarah

Panduan mengikuti urutan UI terlihat dan memakai kontrol nyata yang berbeda. Pengaturan menghilangkan penjelasan tindakan perubahan yang tidak tersedia. Profil, Pengguna, Dokumen, Kalender, dan Study memakai target bermakna, termasuk kalender kosong, menu samping dokumen, dan detail kartu.

## SPA dan pemulihan target

Pemblokir kesiapan berbagi kepemilikan yang aman saat diganti antara impor bundel dan langsung. Masa hidup halaman melepas kontribusi lama. Gulir atau perubahan tata letak tidak diam-diam melewati target yang sudah ditampilkan. Satu panduan otomatis berjalan per tampilan; panduan tambahan dapat dipilih melalui ?.

## Aturan penulisan tutorial

Petunjuk dan keempat dokumen tutorial host mencakup penemuan tampilan aktif, kartu stabil, cabang dialog eksplisit, kondisi opsional dan kosong, urutan UI, pembersihan, serta verifikasi sumber dan produksi. Menu akun ditutup sebelum tutorial dimulai.

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
- [f681187ca](https://github.com/Cognis-Labs-HQ/Cognis/commit/f681187ca572fa4270f9b398d429a3d1177c62d3)
- [09b9c7547](https://github.com/Cognis-Labs-HQ/Cognis/commit/09b9c754784d85d080a675615e35f01281ee6c4b)
- [f578b8115](https://github.com/Cognis-Labs-HQ/Cognis/commit/f578b8115e452d8afae8ef21dbbd86dd5756eceb)
- [c7eefff5a](https://github.com/Cognis-Labs-HQ/Cognis/commit/c7eefff5ad35c79574c1067ee97032cc6a76045a)
- [ddf8e825b](https://github.com/Cognis-Labs-HQ/Cognis/commit/ddf8e825b565329c8b676de10ff4d411c133b6e1)
- [90fffbcb7](https://github.com/Cognis-Labs-HQ/Cognis/commit/90fffbcb7ff0a12417bf470febee6bfc05c30990)
- [7f62e2fa8](https://github.com/Cognis-Labs-HQ/Cognis/commit/7f62e2fa80bc97b99acd51a6f5334c04bd350cb5)
- [c3b6df7dc](https://github.com/Cognis-Labs-HQ/Cognis/commit/c3b6df7dc95f6e50e9e050d797b6b9c80398d5cf)
- [3ab1a20da](https://github.com/Cognis-Labs-HQ/Cognis/commit/3ab1a20da1a049bcfc8acabc4586f9c336c3fc12)
- [6d7276bad](https://github.com/Cognis-Labs-HQ/Cognis/commit/6d7276bad6c38081af1c6d688255323df5f48e71)
- [73e90e7f6](https://github.com/Cognis-Labs-HQ/Cognis/commit/73e90e7f6950a3ec1557d896d745d1593d7419da)
- [1b4c0e338](https://github.com/Cognis-Labs-HQ/Cognis/commit/1b4c0e3380b78f86ab4e6b54d8751c7805023f89)
- [ed98d0a85](https://github.com/Cognis-Labs-HQ/Cognis/commit/ed98d0a85646823c09848713d32a9f6f9d8652be)
- [d23429b0f](https://github.com/Cognis-Labs-HQ/Cognis/commit/d23429b0f4df4ec6f5c276678e9eb7fc09651944)
- [b6874a330](https://github.com/Cognis-Labs-HQ/Cognis/commit/b6874a3309123f93968bec3c7a1091354f71c5d1)
- [0dd7b9917](https://github.com/Cognis-Labs-HQ/Cognis/commit/0dd7b9917948061b2e1ea929c00748d20fbcc6c7)
