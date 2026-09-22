# Pustaka dan Keamanan

**Cabang Fitur:** work

## Modul UI Pustaka terfokus

Titik masuk peramban Study Library kini menjadi koordinator halaman yang ringkas. Perenderan kartu, kisi berlapis, popup detail, pemilihan, interaksi peramban, dan interaksi varian berada dalam modul terfokus sekitar 100–200 baris tanpa mengubah perilaku UI yang ada.

## Koreksi kemajuan atomik

Peristiwa kemajuan biasa tidak lagi dapat menyisipkan pengenal kompensasi. Koreksi memakai operasi khusus, dan penyimpanan peristiwa persisten menjamin secara atomik bahwa setiap target memiliki paling banyak satu koreksi.

## Penghapusan Pustaka terotorisasi

Penghapusan Pustaka kini menyelesaikan kaskade akhir dan mengotorisasi setiap entri yang terdampak di dalam transaksi penghapusan, sehingga menutup celah antara otorisasi dan perubahan relasi bersamaan.

## Batas modul yang lebih kuat

Validasi modul eksternal menolak tautan simbolis sumber, tautan direktori (termasuk nama bertitik), dan tautan aset yang keluar dari batas modul. Tautan aset lokal modul yang aman tetap dapat digunakan. Kelas UI terlindungi yang ditargetkan melalui pemilih atribut kelas juga dikenali.

## Ejaan sekunder pada judul

Ejaan alternatif kata dan kalimat kini muncul sebagai konten judul sekunder yang dapat dinavigasi tepat di bawah ejaan utama. Varian struktural seperti karakter tidak lagi diulang dalam konten detail.

## Judul pelafalan yang jelas

Ejaan utama dan sekunder tidak lagi diulang sebagai metadata pelafalan. Pelafalan tetap berupa teks judul biasa dan tidak pernah diubah secara heuristik menjadi tautan unit tulisan, sehingga relasi yang ditampilkan hanya mencerminkan graf Pustaka yang disediakan modul.

## Ketepatan relasi Pustaka dan paket konten

Pratinjau penghapusan kini menghormati kebijakan kaskade, pelepasan, dan pembatasan tanpa menjadikan entri bergantung sebagai penghapusan eksplisit. Entri tersembunyi atau yang ditempatkan tidak masuk urutan popup. Peningkatan paket konten mempertahankan rekaman penyedia yang tidak ada secara bawaan; penerbit dapat secara eksplisit meminta pemangkasan otoritatif.

## Perilaku kemajuan yang tahan lama dan deterministik

Percobaan ulang kemajuan membandingkan peristiwa secara struktural, stempel waktu yang sama memakai ID peristiwa sebagai penentu deterministik, tanggal ekstrem yang tidak aman ditolak sebelum penyimpanan, JSON rusak menghasilkan galat klien, dan adapter nonaktif memblokir kapabilitas serta hook alurnya.

## Validasi stylesheet modul yang lengkap

Validasi modul eksternal kini mendeteksi URL internal Cognis langsung di impor CSS dan URL aset maupun di skrip.

## Batas tanggal tinjauan yang aman

Proyeksi kemajuan kini membatasi interval tinjauan hingga empat belas hari agar sesuai dengan validasi stempel waktu peristiwa dan memastikan setiap peristiwa yang diterima tetap dapat dibangun ulang.

## Navigasi dasbor yang andal

Navigasi dasbor terprogram kini memakai hook otorisasi rute generik alih-alih fungsi pembantu khusus Study yang telah dihapus, sehingga navigasi tidak lagi gagal akibat galat referensi.

## Nama paket bahasa Inggris yang konsisten

Indeks versi kini memakai nama paket bahasa Inggris kanonis di setiap varian bahasa, sementara dokumentasi di sekitarnya tetap dilokalkan.

## Halaman pustaka Study yang terfokus

Tampilan terperinci setiap lapisan Pustaka kini dibuka sebagai halaman tersendiri dari subnavigasi Study. Halaman utama Pustaka administrator memakai indeks lapisan yang ringkas dan konsisten dengan jumlah entri, dan submenu Study kini mencakup halaman Papan peringkat yang dilokalkan.

## Halaman Study andal dan kartu Pustaka terfokus

Rute SPA adapter yang lebih spesifik kini didahulukan daripada rute turunan gateway generik sehingga Papan peringkat dapat dimuat dengan benar. Navigasi Study memakai label cadangan yang disediakan saat bundel terjemahan opsional tidak tersedia. Pratinjau Pustaka kini berfokus pada item dan pelafalan, sedangkan kartu detail menampilkan pelafalan, definisi, metadata, hubungan, dan contoh.

## Skor, pencapaian, dan kompetisi langsung yang dapat diperluas

Core kini mengorkestrasi skor XP berbasis kumpulan dengan tingkat kesulitan penyedia, bobot aktivitas, penyelesaian tepat waktu, hadiah penyelesaian pertama dan pengulangan diskret, pengali global atau penyedia berbasis cakupan, booster yang dapat ditukarkan, serta rekor pribadi. Penyedia dapat mendaftarkan pencapaian dinamis normal, langka, dan legendaris dengan penghargaan berbasis bukti yang tidak dapat diubah dan terlihat pada profil yang diizinkan. Study mengubah kumpulan peristiwa Progress terverifikasi menjadi XP papan peringkat, menyajikan peringkat langsung untuk definisi pribadi, acara, dan kelas, serta menganimasikan perubahan peringkat retrospektif dengan dukungan pengurangan gerakan.

## Kontrak keterlibatan publik untuk penyedia

Core kini menerbitkan kapabilitas skor, pendaftaran achievement, dan pencatatan aktivitas melalui `ctx`; Papan Peringkat Study menerbitkan kontrak penyedianya dengan cara yang sama. Penilaian kini memvalidasi masukan penyedia yang dibatasi, bukti unik, target waktu, dan hadiah berbantuan petunjuk. Dokumentasi komponen terlokalisasi yang baru menjelaskan pendaftaran, perluasan alur, validasi bukti, privasi, dan operasi papan peringkat musiman.

## Pisahkan administrasi dan pembelajaran Pustaka

Akar Pustaka kini menjadi editor khusus administrator untuk setiap rekaman dalam bahasa terpilih, termasuk data definisi dan relasi tersembunyi. Lapisan pelajar dimuat pada rute Study mandiri yang ditautkan langsung dari subnavigasi, sekaligus memulihkan tampilan kartu kaya, definisi, metadata, filter, varian, dan tampilan detail.

## Penyuntingan Pustaka bersih dan rute Study andal

Lapisan Pustaka kini berada di menu samping administrator. Lapisan terpilih tampil sebagai daftar baris yang bersih; pensil yang mengikuti tema membuka popup penyuntingan terfokus. Rute lapisan pelajar dan Papan Peringkat kini memuat bundel stylesheet Page Composer lengkap. Rute Papan Peringkat tidak lagi salah mendeklarasikan kapabilitas server sebagai kapabilitas browser yang hilang, sehingga router aplikasi memasangnya langsung alih-alih meneruskannya ke pemuat child Study umum.

## Detail Pustaka terfokus dan startup Study stabil

Pratinjau Pustaka kini menyediakan posisi tetap untuk metadata dan cakupan, sedangkan pelafalan dan definisi berada di popup detail bersama pohon relasi masuk dan keluar satu tingkat. Editor administrator menggunakan kontrol berbasis skema dan pelacak perubahan terlindungi alih-alih JSON mentah; pensil sesuai tema tetap terlihat di tepi baris. Rute Study tetap terdaftar selama inisialisasi bahasa, dan bootstrap adapter berdasarkan dependensi memastikan Progress siap sebelum Papan Peringkat.

## Integrasi platform yang dibatasi pada Study

Implementasi kini mempertahankan perilaku API dan router web dari baseline Library yang telah ditetapkan. Registrasi kapabilitas engagement tetap berada dalam komposisi API, sedangkan aktivasi modul, validasi batas, perutean permintaan startup, pemuatan pesan autentikasi, dan pengurutan rute SPA generik tidak lagi diubah oleh fitur Study ini.

## Paritas startup Study dipulihkan

Penjadwal adapter Study khusus cabang dan kenaikan versi paket gateways telah dihapus. Penemuan serta startup adapter Study kini sama persis dengan baseline development. Leaderboard me-resolve Progress secara lazy melalui ctx, sehingga dependensinya dipertahankan tanpa mengubah bootstrap seluruh gateway atau menunda modul yang sudah ada.

## Siklus awal ekstensi yang benar

Modul eksternal yang dinonaktifkan kini hanya memuat titik masuk API khusus untuk keadaan nonaktif. Cognis tidak lagi menjalankan bootstrap API normal modul saat memulihkan modul yang dinonaktifkan, sehingga kebuntuan awal yang memblokir pemeriksaan kesehatan dan semua permintaan proksi telah dihapus. Perbaikan dari rangkaian pengujian lengkap juga memulihkan batas kepemilikan UI, versi komponen yang tersinkronisasi, judul popup, terjemahan shell, dan ukuran sumber yang mudah ditinjau.

## Pemulihan modul tersimpan yang cepat

Saat dimulai, status aktif modul yang tersimpan kini dipulihkan tanpa menjalankan ulang rangkaian pengujian pengaktifan dan audit integritas. Pemeriksaan tersebut tetap dijalankan saat pengaktifan eksplisit, sedangkan mulai ulang biasa tidak lagi memblokir semua permintaan HTTP karena pengujian modul eksternal yang mungkin berjalan lama.

## Infrastruktur awal selaras development

Perbandingan dari klon lengkap terhadap development menemukan perubahan pemulihan skema basis data dan pelaksana pengujian modul eksternal yang tidak terkait di dalam cabang Study bertumpuk. Infrastruktur MariaDB, PostgreSQL, dan pengujian modul yang sensitif saat dimulai kini sama dengan implementasi development tepercaya; kode fitur Leaderboard, Progress, dan Library tetap terisolasi pada komponen pemiliknya.

## Penguatan papan peringkat berdasarkan tinjauan

Status papan peringkat kini disimpan secara tahan lama, peristiwa bukti bersifat tetap dan diverifikasi terhadap jendela waktu, serta peringkat menghormati seri penuh dan aturan pemecah seri yang dikonfigurasi. Akses kelas, kohort, dan acara diotorisasi sebelum definisi atau klasemen dikembalikan, sementara kait alur kini ikut dalam pengiriman, pemeringkatan, dan pergantian musim.

## Antarmuka Study yang akurat dan terlokalisasi

Halaman papan peringkat kini melaporkan kegagalan permintaan, mendukung pemilihan setiap papan peringkat yang dapat diakses, menampilkan nilai yang tepat untuk tiap kolom, dan melokalkan metadata aksesibilitas tabel. Navigasi Study memperoleh ketersediaan papan peringkat dari rute terdaftar dan tidak mengganti label dengan bahasa lain.

## Keamanan pustaka, penilaian, dan modul

Pembaruan pustaka mempertahankan kunci pelokalan yang dibuat dan entri yang dihapus langsung menghilang. Pencapaian tetap terbatas pada penyedianya, penukaran booster tidak menimpa pengubah global, dan titik masuk modul nonaktif divalidasi batasnya sebelum diimpor.

## Pemulihan modul eksternal secara bersamaan

Modul eksternal yang aktif kini dimulai secara bersamaan ketika status tersimpan dipulihkan. Dengan demikian, modul yang lambat atau macet hanya memakai satu jendela waktu mulai yang terbatas, bukan menambahkan batas waktu secara berurutan untuk setiap modul aktif. Hal ini mencegah penghalang permintaan API tertahan selama beberapa menit dan menghilangkan respons proksi 499 serta 504 yang diakibatkannya.

## Commit

- [f006429b](https://github.com/Cognis-Labs-HQ/Cognis/commit/f006429b)
- [458c6bea](https://github.com/Cognis-Labs-HQ/Cognis/commit/458c6bea)
- [a009f770](https://github.com/Cognis-Labs-HQ/Cognis/commit/a009f770)
- [799fc33d](https://github.com/Cognis-Labs-HQ/Cognis/commit/799fc33d)
- [d472ffa9](https://github.com/Cognis-Labs-HQ/Cognis/commit/d472ffa9)
- [992973f5](https://github.com/Cognis-Labs-HQ/Cognis/commit/992973f5a421fa0043bfa792a1b4757abcff8209)
- [4c7366ad](https://github.com/Cognis-Labs-HQ/Cognis/commit/4c7366adec02748038211fcdf407f8b5b2ea759e)
- [2b097121](https://github.com/Cognis-Labs-HQ/Cognis/commit/2b097121)
- [223044e0](https://github.com/Cognis-Labs-HQ/Cognis/commit/223044e0)
- [5ae64121](https://github.com/Cognis-Labs-HQ/Cognis/commit/5ae64121)
- [504e4b2b](https://github.com/Cognis-Labs-HQ/Cognis/commit/504e4b2b)
- [a0f0832a](https://github.com/Cognis-Labs-HQ/Cognis/commit/a0f0832a)
- [8d78ecd3](https://github.com/Cognis-Labs-HQ/Cognis/commit/8d78ecd3)
- [633e2579](https://github.com/Cognis-Labs-HQ/Cognis/commit/633e2579)
- [73464474](https://github.com/Cognis-Labs-HQ/Cognis/commit/73464474)
- [da7bfcc3](https://github.com/Cognis-Labs-HQ/Cognis/commit/da7bfcc3)
- [9748e38a](https://github.com/Cognis-Labs-HQ/Cognis/commit/9748e38a)
- [dd548a27](https://github.com/Cognis-Labs-HQ/Cognis/commit/dd548a27)
- [5917b511](https://github.com/Cognis-Labs-HQ/Cognis/commit/5917b511)
- [b4ae9baf](https://github.com/Cognis-Labs-HQ/Cognis/commit/b4ae9baf)
- [d1cdc256](https://github.com/Cognis-Labs-HQ/Cognis/commit/d1cdc256)
- [9fcc23e3](https://github.com/Cognis-Labs-HQ/Cognis/commit/9fcc23e3)
- [87275211](https://github.com/Cognis-Labs-HQ/Cognis/commit/87275211)
- [043b1e4b](https://github.com/Cognis-Labs-HQ/Cognis/commit/043b1e4b)
- [cdc1240f](https://github.com/Cognis-Labs-HQ/Cognis/commit/cdc1240f)
