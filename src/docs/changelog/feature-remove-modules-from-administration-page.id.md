# Bursa Modul

**Cabang Fitur:** feature-remove-modules-from-administration-page

## Status kanal rilis yang jelas

Pilihan kanal rilis kini memakai kontrol netral dengan status terpilih yang mudah dikenali. Detail modul menampilkan kanal terpasang beserta versi manifes sebenarnya, sedangkan modul yang diperbarui menampilkan peringatan mulai ulang hingga kontainer Cognis dimulai ulang dan semua rute yang disuntikkan diaktifkan.

## Menu tindakan modul yang konsisten

Detail modul yang terpasang kini menggunakan menu hamburger tertambat bersama untuk tindakan lanjutan, sehingga tampilan dan interaksinya konsisten dengan menu tindakan di bagian Cognis lainnya.

## Toko aplikasi khusus

Modul kini memiliki halaman Administrasi terpisah dengan tampilan terpasang, tersedia, rekomendasi, dan kategori serta sumber GitHub dan GitLab yang dapat dikonfigurasi.

## Repositori eksternal

Administrator dapat menemukan repositori publik atau privat dengan PAT opsional yang dilindungi keyring; Cognis memvalidasi manifes dan UUID tetap saat instalasi.

## Dependensi UUID

Semua manifes komponen tetap memiliki nama dan ID yang mudah dibaca, tetapi memakai UUID stabil untuk dependensi.

## Kontrol bursa yang andal

Kartu modul, filter, pengaturan sumber, dan kontrol siklus hidup kini langsung memperbarui isi bursa tanpa mengatur ulang tata letak halaman di sekitarnya. Detail modul tetap menampilkan navigasi bursa, sementara ukuran kartu yang konsisten menjaga deskripsi dan tindakan siklus hidup tetap sejajar.

Checkout eksternal kini melewati pemeriksaan kesiapan repositori untuk kontrak paket dan rute, titik masuk, gambar, jalur aman, serta checksum berkas opsional sebelum dapat menggantikan instalasi aktif.

Repositori terpasang kini ditemukan sebagai komponen runtime lengkap. Titik masuk bootstrap dapat menyumbangkan rute, UI, dokumentasi, catatan perubahan, kapabilitas, dan tahap alur melalui lingkup `ctx` yang dilacak; penonaktifan atau penghapusan membongkar seluruh kontribusi tersebut.

Implementasi modul bawaan telah dihapus dari pohon sumber dan kini disediakan melalui marketplace. Cognis Labs HQ di GitHub selalu tersedia sebagai sumber modul tepercaya yang tidak dapat diubah.

## Lewati repositori tidak valid

Marketplace Modul kini mengabaikan repositori yang tidak menyediakan manifes modul yang lengkap dan valid. Satu repositori yang tidak terkait atau sumber yang tidak tersedia tidak lagi dapat menggagalkan pemuatan halaman Modul.

## Gunakan ikon pengganti

Kartu modul kini mengganti gambar eksternal yang tidak tersedia dengan ikon tanda tanya yang sesuai tema tanpa membuka popup kesalahan runtime.

## Segarkan sumber modul

Halaman Modul kini menyediakan kontrol Segarkan di samping Sumber Modul untuk meminta ulang setiap penyedia yang dikonfigurasi dan membangun kembali katalog yang terlihat.

## Kelola dan temukan sumber secara bertahap

Sumber Modul kini terbuka sebagai pengelola daftar dan editor khusus. Organisasi tepercaya bawaan tetap terlihat dan hanya-baca, sedangkan sumber khusus dapat ditambah, disunting, atau dihapus. Halaman Modul langsung menampilkan modul yang sudah diketahui dan menambahkan hasil secara independen saat setiap sumber yang dikonfigurasi merespons.

## Pilih cabang dan deteksi pembaruan

Detail marketplace kini menampilkan setiap cabang repositori dan otomatis memilih cabang bawaan. Instalasi mencatat cabang dan commit yang dipilih sehingga kartu dan detail modul dapat menawarkan tindakan Perbarui saat cabang tersebut berubah.

## Sajikan gambar marketplace dengan aman

Gambar marketplace kini diambil oleh server dan disajikan melalui URL asal sama yang sulit ditebak. Gambar yang hilang memakai ikon tanda tanya bawaan tanpa melonggarkan Content Security Policy.

## Kurasi modul rekomendasi

Status rekomendasi kini berasal dari daftar UUID terbitan yang dapat dikonfigurasi administrator, bukan dari manifes modul. Pengaturan marketplace kini memuat konfigurasi rekomendasi dan sumber.

## Selesaikan instalasi modul

Modul yang dipasang langsung diimpor ke runtime dan tetap nonaktif sampai administrator mengaktifkannya. Gambar marketplace dimuat melalui URL publik asal sama yang sulit ditebak.

## Sempurnakan detail marketplace

Lisensi ditampilkan terpisah dari tag, detail memakai seluruh lebar hasil, dan kontrol SVG ringkas menggantikan tindakan kembali dan segarkan yang panjang.

## Pisahkan pemasangan dari aktivasi

Modul yang dipasang kini tetap nonaktif sampai administrator mengaktifkannya secara eksplisit. Mengaktifkan atau menonaktifkan modul langsung menyegarkan plugin bilah navigasi agar kontribusi navigasi baru tampil tanpa memuat ulang halaman.

## Sesuaikan kontrol marketplace dengan tema

Kontrol kembali dan segarkan kini memakai aset SVG terang dan gelap khusus yang dipilih sesuai tema dasbor aktif.

## Pertahankan modul yang ditemukan

Manifes marketplace disimpan dalam cache per sumber terkonfigurasi. Mencopot modul segera mengembalikannya ke Tersedia, kegagalan sumber sementara mempertahankan entri cache, dan modul baru menghilang setelah semua sumber terkonfigurasi berhasil memastikan modul tersebut tidak ada.

## Keluarkan core dari daftar modul

Cognis Core tidak lagi dikembalikan oleh daftar administrasi modul karena inti platform bukan modul yang dapat dipasang.

## Verifikasi lisensi yang dinyatakan

Metadata lisensi hanya ditampilkan bila berkas lisensi yang dikenali tersedia di akar repositori. Validasi instalasi menolak metadata lisensi tanpa bukti repositori tersebut.

## Beri waktu untuk pemasangan modul

Pemasangan marketplace kini memakai jendela permintaan dua menit agar kloning dan validasi repositori besar tidak gagal karena batas waktu API umum tiga puluh detik.

## Tampilkan semua modul terlebih dahulu

Filter status modul kini memiliki Semua dan memilihnya secara bawaan sehingga modul terpasang, tersedia, dan direkomendasikan tampil bersama saat halaman dibuka.

## Instal rilis dengan umpan balik responsif

Penemuan modul kini menyertakan tag repositori bersama cabang, sementara pemilih detail tetap menggunakan cabang bawaan repositori secara default. Tombol siklus hidup menampilkan indikator proses di dalam tombol, dan instalasi modul memakai batas waktu permintaan dua menit.

## Satukan pengaturan marketplace

Sumber Modul kini hanya tersedia sebagai bagian khusus dalam dialog pengaturan marketplace. Penyedia dan versi dipisahkan dari tag kategori, serta ikon pengaturan mendukung tema terang dan gelap.

## Uji modul sebelum aktivasi

Saat modul diaktifkan, semua pengujian JavaScript dan TypeScript standar yang disediakan checkout modul kini dijalankan sebelum status runtime berubah. Pengujian yang gagal atau kehabisan waktu akan membatalkan aktivasi dan melaporkan kegagalan pengujian modul.

## Sertakan modul eksternal dalam perintah pengujian inti

Perintah utama `npm test` kini menemukan pengujian di pohon sumber Cognis dan akar checkout modul eksternal yang dikonfigurasi. Checkout di luar repositori juga didukung melalui `COGNIS_EXTERNAL_MODULES_ROOT`.

## Pulihkan katalog marketplace secara langsung

Halaman Modul kini memuat katalog tersimpan per sumber sebelum penemuan latar belakang dimulai, sehingga modul yang sudah dikenal tetap terlihat setelah navigasi dan mulai ulang server. Penyegaran repositori memperbarui kandidat yang berhasil secara terpisah dan mempertahankan entri cache ketika pemeriksaan individual belum memberikan kepastian.

## Pulihkan kompatibilitas katalog

Instalasi menerima katalog dari sebelum metadata tag rilis diperkenalkan, sementara pemeriksaan repositori terpisah mencegah repositori lain menyembunyikan entri katalog yang valid.

## Tangani kegagalan instalasi secara lokal

Kegagalan instalasi modul yang diharapkan tidak lagi memicu status pemulihan koneksi global atau notifikasi permanen “Koneksi terputus”; tindakan marketplace tetap melaporkan kegagalannya sendiri.

## Publikasikan perubahan siklus hidup modul secara langsung

Operasi instalasi, aktivasi, penonaktifan, pembaruan, dan penghapusan yang selesai kini langsung memperbarui marketplace, menerbitkan peristiwa siklus hidup terstruktur, menyegarkan pendaftaran navigasi, dan menyelaraskan status otoritatif dari server tanpa memuat ulang halaman. Pemilih versi pada tampilan detail juga mengikuti tema aktif.

## Pertahankan sinkronisasi tindakan modul

Kemajuan siklus hidup modul kini disimpan berdasarkan UUID modul, bukan hanya pada elemen DOM yang diklik, sehingga kontrol nonaktif dan indikator proses tetap ada saat berpindah antara kartu dan detail. Operasi yang berhasil langsung menampilkan kontrol valid berikutnya. Pemilih rilis tidak lagi memakai kelas mode terang yang bertentangan, dan instalasi gagal kini menampilkan kesalahan server secara tepat sekaligus mencatat log server dan browser terstruktur.

## Membuat pemasangan marketplace tangguh dan sadar rilis

Pemasangan modul kini berjalan sebagai tugas latar belakang yang dipantau sehingga reverse proxy tidak mengubah klon yang berhasil menjadi galat 504. Cognis menyegarkan sumber saat server dimulai, membandingkan versi manifes, mendukung perpindahan kanal rilis, meminta konfirmasi penurunan versi, dan menyediakan pembaruan paksa tingkat lanjut.

## Menambahkan galeri media dan kontrol yang aman untuk tema

Repositori modul dapat menyediakan direktori `media/` di akar berisi gambar dan video yang didukung. Tampilan detail menampilkannya sebagai galeri horizontal, sementara pemilih kanal rilis native memakai warna tema eksplisit tanpa kelas select yang bertentangan.

## Mencoba kembali unduhan modul yang terputus

Pemasangan modul kini memaksa transport HTTP/1.1 Git yang lebih kompatibel dan mencoba kembali kegagalan klon sementara seperti koneksi terputus, batas waktu, kegagalan DNS, dan transfer TLS yang terganggu. Setiap percobaan dimulai dengan direktori staging yang bersih, sedangkan kegagalan repositori atau validasi permanen tetap dihentikan segera dengan diagnosis yang tepat.

## Diagnosis batas waktu GitHub

Unduhan modul kini menghentikan upaya kloning GitHub yang macet setelah tiga puluh detik, mencoba kembali kegagalan sementara, dan mencatat penyebab MTU jaringan kontainer yang dikenal dalam log server terstruktur. Administrator menerima toast khusus yang menyarankan pemeriksaan MTU jaringan host atau Docker, bukan Cognis yang menimpa jaringan deployment.

## Muat modul eksternal sepenuhnya

Konteks bootstrap modul eksternal kini menerima semua metode HTTP yang didukung serta kontribusi navbar, rute SPA, pengaturan, administrasi, halaman, teks autentikasi, sumber daya statis, flow, logging, dan capability tercakup. Penyedia rapat eksternal dapat mendaftarkan navigasi dan rute melalui kontrak yang dapat dilepas seperti komponen bawaan.

## Selaraskan kontrol detail modul

Menu hamburger lanjutan kini berada dalam baris navigasi atas bersama kontrol Kembali pada detail modul, sedangkan tindakan instalasi dan siklus hidup tetap berada dalam baris tindakan tersendiri.

## Pertahankan modul dan gambar terpasang

Deployment Docker kini menyimpan modul eksternal dalam volume bernama khusus yang dipasang pada akar modul eksternal yang dikonfigurasi, sehingga modul terpasang tetap tersedia setelah kontainer aplikasi dibangun ulang. Rekonsiliasi marketplace juga mempertahankan URL ikon dan banner yang diproksi katalog saat status manifes terpasang digabungkan, sehingga gambar tidak lagi menghilang sampai halaman disegarkan.

## Pertahankan aktivasi saat pembaruan paksa

Pembaruan Paksa kini menonaktifkan sementara modul aktif sebelum mengganti checkout-nya, lalu mengaktifkannya kembali. Jika unduhan atau validasi gagal, Cognis tetap mengaktifkan kembali checkout yang ada agar pembaruan paksa yang gagal tidak membuat modul tetap nonaktif secara tidak terduga.

## Ubah kanal rilis secara terarah

Pemilihan kanal rilis untuk modul terpasang kini berada di menu lanjutan. Administrator memilih dari daftar tombol yang dapat digulir dan mengonfirmasi sebelum Cognis otomatis memasang kanal tersebut. Tombol siklus hidup menampilkan Memasang, Meningkatkan, Menurunkan, atau Mengubah Kanal Rilis dengan indikator pemuatan selama proses, lalu berubah menjadi Terpasang setelah berhasil.

## Muat rute UI modul eksternal dari direktori pemasangannya

Modul terpasang kini ditemukan berdasarkan UUID stabilnya di direktori modul eksternal. Halaman dan kontribusi navigasi yang dideklarasikan dimuat secara otomatis saat aplikasi dimulai, bukan dicari di jalur modul bawaan.

## Selesaikan bootstrap sebelum permintaan

Cognis kini menunggu pemulihan status modul tersimpan dan bootstrap modul selesai sebelum menerima permintaan. Dengan demikian, skrip dan gaya modul eksternal telah terdaftar sebelum diminta oleh halamannya.

## Sediakan kapabilitas autentikasi

Gateway autentikasi kini menerbitkan fungsi autentikasi permintaan dan akses peran melalui bus kapabilitas. Modul eksternal dapat memulai rute API terlindungi tanpa mengimpor internal gateway, sehingga aset UI dan pendaftaran navigasinya tetap aktif.

## Muat hanya kapabilitas UI yang dinyatakan

Modul dapat menyatakan `requiresCapabilities` dalam manifesnya. Sebelum memasang rute modul, Cognis hanya mengimpor skrip penyedia terdaftar untuk kapabilitas `ui:*` yang dinyatakan, sehingga layanan UI yang diperlukan siap tanpa memberikan integrasi yang tidak terkait.

## Periksa dan dokumentasikan kapabilitas

Owner dapat mencantumkan semua ID kapabilitas terdaftar melalui `GET /api/v1/system/capabilities` atau `cognisctl system:capabilities`. Dokumentasi modul, gateway Autentikasi, dan adapter Profil kini mencatat deklarasi kebutuhan serta kapabilitas yang disediakan setiap penyedia.

## Tampilkan arah versi rilis

Kartu dan tampilan detail modul terpasang kini menempatkan versi saluran terpilih yang berbeda di bawah versi saat ini. Peningkatan memakai panah ke atas, sedangkan penurunan versi yang jarang terjadi memakai panah ke bawah dalam pil oranye muda.

## Pertahankan detail modul stabil

Membuka atau memperbarui tampilan detail modul kini mempertahankan posisi halaman. Setiap versi yang ditampilkan memakai awalan `v`, dan pembaruan modul aktif menjalankan urutan nonaktifkan, pasang, lalu aktifkan kembali dalam satu tindakan.

## Stabilkan kontrol detail modul

Halaman detail modul kini memakai deep link UUID berbasis router sambil tetap berada di Page Composer. Penyegaran siklus hidup mempertahankan susunan tombol yang terlihat, termasuk saat modul aktif dinonaktifkan sementara untuk peningkatan.

## Bootstrap halaman modul langsung sekali

Pemuatan langsung rute SPA modul eksternal kini melalui entrypoint inti yang mengimpor penyedia kapabilitas yang dinyatakan sebelum rute modul. URL penyedia dan rute memakai versi aset yang sama dengan navigasi router, mencegah kapabilitas yang sesekali hilang dan kontribusi navbar ganda.

## Siapkan modul bawaan untuk dipisahkan

Repositori modul eksternal dapat menyediakan metadata, lisensi, README, inventaris integritas lengkap, panduan distribusi terjemahan, dependensi UUID, dan kebutuhan kapabilitas eksplisit.

## Tingkatkan penjelajahan tangkapan layar modul

Tangkapan layar detail modul kini berada dalam karusel terbatas dengan kontrol sebelumnya dan berikutnya, pratinjau gambar di sebelah yang memudar, transisi animasi, dan rotasi otomatis. Manifes dengan kolom opsional `template: true` tidak ditampilkan dalam hasil marketplace maupun tampilan detail langsung.

## Terapkan modul marketplace yang unik

Modul eksternal dapat dipindahkan ke repositori khusus tanpa dibundel. Penemuan marketplace menerima repositori pertama untuk setiap UUID, mencatat dan menolak duplikat berikutnya, serta memperbarui metadata tampilan sambil mempertahankan status siklus hidup.

## Abaikan direktori infrastruktur gateway

Penemuan gateway otomatis kini hanya menjalankan direktori yang memiliki manifes gateway, sehingga direktori infrastruktur `gateways/reuse` tidak lagi diimpor sebagai gateway dalam build produksi.

## Perjelas umpan balik siklus hidup modul

Penonaktifan modul kini dicatat sebagai peringatan dan penghapusan modul eksternal dicatat secara eksplisit. Penyegaran marketplace menampilkan satu pemberitahuan selesai untuk setiap klik, sedangkan modul tetap terlihat kecuali manifesnya secara eksplisit menetapkan `template` ke `true`.

## Rekomendasikan modul Cognis HQ

Dokumen rekomendasi bawaan disajikan oleh Cognis dan hanya berisi nilai UUID modul yang dikonfigurasi secara eksplisit.

## Perluas pencatatan siklus hidup modul

Penambahan, pembaruan, penghapusan, pemindaian sumber, dan jumlah hasil dicatat dengan tingkat yang sesuai; kegagalan validasi dan pengaktifan dicatat sebagai kesalahan. Penemuan gambar dapat memakai ekstensi lain yang didukung jika ekstensi aset yang dideklarasikan tidak tersedia.

## Cegah kilatan gambar modul

Kartu modul dan media detail kini tetap tersembunyi sampai setiap gambar yang disegarkan melaporkan dimensi yang valid. Dimensi ikon yang tetap juga menyediakan ruang kartu sebelum pemuatan, sehingga gambar modul mentah atau terlalu besar tidak lagi berkedip saat marketplace disegarkan.

## Pertahankan modul saat pemindaian tidak meyakinkan

Pemindaian marketplace tidak lagi menganggap respons repositori kosong, manifes yang sementara hilang, respons sementara yang tidak valid, atau kegagalan permintaan sumber sebagai bukti bahwa modul yang sebelumnya ditemukan telah dihapus. Entri cache tetap terlihat sampai sumbernya dihapus secara eksplisit, dan log peringatan menunjukkan pemindaian yang gagal serta jumlah modul yang dipertahankan.

## Penemuan modul lebih aman dan efisien

Penyegaran marketplace dipusatkan dalam satu pemindaian terautentikasi, token pengguna GitHub ditambahkan untuk sumber tepercaya, pemeriksaan dependensi dan persetujuan dipulihkan sebelum kode eksternal dijalankan, serta permintaan manifes GitHub Enterprise memakai API yang dikonfigurasi.

## Selesaikan pemuatan modul langsung

Pemuatan langsung halaman Modul kini selalu mengakhiri tugas pemuatan yang dilacak setelah penyusun halaman selesai atau gagal, sehingga roda pemuatan tidak terus terlihat setelah penyegaran browser.

## Simpan dan batasi pemindaian

Setelah server dimulai ulang, data modul terlebih dahulu dimuat dari katalog marketplace yang tersimpan. Pemindaian otomatis saat halaman atau server dimulai tidak lagi memakai kuota penyedia. Percobaan pemindaian disimpan dengan interval satu jam agar penyegaran berulang memakai kembali katalog di cakram.

## Otoritas cache sumber

Sumber bawaan Cognis Labs HQ kini menerima pembaruan PAT sementara bidang identitasnya tetap terkunci. UUID modul duplikat dipilih dari sumber Cognis, dan katalog marketplace, metadata pemindaian, serta aset disimpan di bawah direktori modul yang dikonfigurasi pada .cache.

## Gunakan kredensial GitHub segera

Bidang PAT yang telah dikonfigurasi menampilkan nilai tersamar tanpa mengungkap rahasia. Menyimpan kredensial baru menghapus masa tunggu pemindaian sumber tersebut, sehingga permintaan marketplace berikutnya langsung memakai otorisasi GitHub yang baru.

## Validasi token penyedia

PAT marketplace baru diperiksa terhadap namespace penyedia yang dikonfigurasi sebelum disimpan. Kredensial yang tidak valid, tidak berwenang, tidak dapat diperiksa, atau cakupannya kurang menampilkan peringatan terlokalisasi dan membiarkan editor sumber tetap terbuka.

## Pertahankan konfigurasi PAT

Pengenal kredensial marketplace kini juga disimpan dalam cache direktori modul. Sumber bawaan Cognis memulihkan penanda PAT yang telah dikonfigurasi setelah server atau kontainer dimulai ulang tanpa menyimpan PAT di luar keyring pengguna.

## Rujuk izin PAT

Peringatan kredensial di antarmuka kini ringkas. Log server mencatat masalah validasi secara tepat serta izin GitHub fine-grained yang diperlukan (akses repositori, baca Metadata, baca Contents), cakupan klasik repo untuk repositori privat, otorisasi SSO organisasi, dan rujukan dokumentasi resmi.

## Stabilkan perubahan rilis

Instalasi perubahan kanal rilis, peningkatan, dan penurunan kini menyimpan branch, commit, dan versi yang dipilih sebelum mulai ulang. Peringatan mulai ulang hanya muncul untuk modul yang sebelumnya aktif, modul terdampak menolak tindakan siklus hidup lain hingga mulai ulang, dan perubahan kanal tanpa perubahan atau yang dibatalkan tidak bertabrakan dengan tindakan berikutnya.

## Pertahankan detail modul

Tindakan detail modul kini memakai menu mengambang composer, sedangkan navigasi status dan kategori memakai toolbar samping yang seimbang dan dapat digulir. Pilihan detail bertahan saat penyegaran, peristiwa siklus hidup, dan toast; hanya navigasi eksplisit yang meninggalkan tampilan detail.

## Selaraskan tindakan modul

Tindakan modul mengambang kini memiliki tinggi dan perataan vertikal yang konsisten, termasuk kontrol kembali. Menu hamburger lanjutan tetap berada di header detail agar popup tertambat dengan baik, dan pembaruan tindakan ringan menghindari penggambaran ulang seluruh kartu modul untuk klik yang tidak terkait.

## Petakan tindakan modul dengan jelas

Tindakan pada kartu modul kini dibungkus ke kolom kisi yang mudah dibaca agar label Terpasang, Peningkatan atau Penurunan, Aktifkan, dan Copot tetap terhubung dengan kontrol yang berbeda. Mengaktifkan modul kini mengaktifkan dan menyimpan dependensi gateway yang dinonaktifkan, sedangkan dependensi yang benar-benar tidak tersedia menghasilkan respons khusus yang dapat ditindaklanjuti alih-alih galat 400 umum.

## Segarkan versi kanal rilis

Penyegaran katalog secara eksplisit kini melewati jeda pemindaian penyedia biasa dan membaca ulang setiap manifes cabang. Jika cabang yang dipilih menyamai versi terpasang, Cognis segera menghapus tindakan penurunan versi yang usang. Penurunan versi yang sebenarnya kini memasang cabang terpilih dan melaporkan Menurunkan serta Versi modul diturunkan secara terpisah dari peningkatan.

## Pasang revisi penurunan yang dipilih

Penurunan versi kini memasang commit tepat yang diumumkan katalog terbaru meskipun cabang bergerak maju sebelum pemasangan dimulai. Indikator penurunan memiliki tema gelap khusus, dan header detail modul mendapat latar buram agar gambar banner tidak terlihat menembus header aplikasi yang melekat.

## Selesaikan versi cabang melalui commit

Penemuan marketplace kini membaca setiap manifes cabang dan rilis melalui SHA commit penyedia yang tidak berubah, bukan nama cabang yang dapat berubah. Hal ini menghindari respons usang dari GitHub Contents API atau cache perantara serta menyelaraskan versi katalog, arah pembaruan yang ditampilkan, dan revisi terpasang dengan commit cabang dari penyedia.

## Validasi dependensi modul sebelum pemasangan

Manifes modul kini dapat mendeklarasikan komponen inti yang diperlukan melalui UUID stabil atau ID lama. Cognis memvalidasi manifes otoritatif dari repositori yang telah di-checkout sebelum mengganti modul terpasang; pemasangan gagal dengan galat khusus jika komponen yang dirujuk tidak ada atau dinonaktifkan, sedangkan dependensi UUID aktif dipasang secara normal.

## Selesaikan dependensi UUID adapter

Instalasi menemukan manifes komponen secara otomatis dan menyelesaikan dependensi UUID melalui gateway pemiliknya, menerima dependensi aktif serta menolak yang dinonaktifkan atau tidak ada.

## Selesaikan dependensi adapter saat pengaktifan

Pengaktifan modul kini menggunakan katalog komponen inti yang ditemukan seperti pada pemasangan. Persyaratan UUID adapter seperti Profil Sosial dan Pesan Sosial diselesaikan ke gateway Sosial pemiliknya alih-alih salah dilaporkan sebagai gateway yang tidak tersedia.

## Hormati dependensi yang sengaja dinonaktifkan

Mengaktifkan modul tidak lagi mengaktifkan gateway yang dinonaktifkan untuk memenuhi manifesnya. Cognis membiarkan dependensi tetap nonaktif, menolak pengaktifan, dan mengembalikan nama komponen yang mudah dibaca—seperti Profile Adapter atau File Gateway—agar halaman Modul dapat menampilkan pesan koreksi yang jelas.

## Penuhi kartu dengan aksi modul

Tombol aksi kartu modul kini membagi seluruh baris yang tersedia secara merata. Kartu dengan satu, dua, atau tiga aksi tidak lagi menyisakan celah sebesar tombol atau memindahkan satu aksi ke baris berikutnya.

## Stabilkan navigasi SPA modul

Halaman SPA yang disediakan modul kini mempertahankan sesi terautentikasi ketika hanya titik akhir modul yang mengembalikan kesalahan otorisasi; Cognis memverifikasi sesi akun sebelum menganggapnya kedaluwarsa. Menu ketersediaan Profil juga dipasang ulang secara idempoten setelah penyegaran kerangka dasbor dan menunggu lembar gayanya, sehingga kontrol kehadiran tidak hilang atau muncul ganda. Bilah navigasi Modul kini tumbuh hingga tinggi alaminya tanpa bilah gulir vertikal sendiri, sedangkan konten utama yang melampaui tinggi tersebut bergulir di panel konten yang sepadan.

## Perbaiki judul Modul dan penyiapan penunjuk

Kartu konten Modul kini mempertahankan judul Modul yang tetap, sedangkan filter status tetap berada di navigasi. Pelacakan penunjuk bersama kini mengimpor bus kapabilitas CTX secara eksplisit sehingga halaman yang disediakan modul tidak gagal saat dimuat langsung.

## Hapus modul bahasa bawaan

Modul eksternal dipasang secara eksklusif dari repositori marketplace mandiri. Penemuan runtime, perutean UI, pemeriksaan integritas, plugin CLI, dan pendaftaran komponen hanya memakai instalasi beralamat UUID di bawah `COGNIS_EXTERNAL_MODULES_ROOT`.

## Gunakan gaya navigasi Modul standar

Navigasi samping Modul kini sepenuhnya mengandalkan tata letak toolbar, jarak, status aktif, perilaku responsif, dan pengaturan gulir bawaan milik page composer tanpa menerapkan penggantian gaya khusus halaman.

## Preferensi modul

Modul dapat mendeklarasikan preferensi boolean, teks, dan angka yang dapat diedit administrator melalui `ui.preferences`. Tampilan detail modul terpasang hanya menampilkan Pengaturan jika bidang tersebut tersedia. Nilai dibatasi pada kunci yang dideklarasikan dan disimpan per administrator melalui penyimpanan preferensi Cognis.

## Operasi siklus hidup yang lebih aman

Pengaktifan modul eksternal kini memerlukan persetujuan sebelum pengujian modul berjalan, dan pencopotan hanya menerima jalur pemasangan UUID kanonis. Pemindaian bursa yang berhasil menghapus repositori yang ditarik, sedangkan penyegaran yang tidak meyakinkan mempertahankan entri terakhir.

## Menata internal pemuat modul

Semua layanan Core yang tersisa untuk siklus hidup modul dan pelaksana pengujian kini berada bersama di bawah `services/module-loader/`, dengan pengujian yang mencerminkan struktur tersebut. Dokumentasi modul eksternal dan kerangka bahasa Study kini lengkap dan tersinkron secara struktural dalam setiap bahasa yang didukung.

## Menjaga navigasi Modul tetap ringkas

Halaman Modul kini mengaktifkan tata letak navigasi subhalaman milik penyusun halaman. Menu samping hanya memakai lebar yang diperlukan oleh isi navigasinya, sehingga sisa ruang tersedia untuk hasil modul.

## Pemuatan marketplace yang aman

Halaman Modul kini mencegah pemuatan langsung saat diimpor oleh router dan mengambil kredensial repositori melalui keyring, sehingga brankas yang terkunci dapat dibuka sebelum penemuan privat atau instalasi. Berkas repositori dan aset tampilan GitHub kini memakai host API yang dikonfigurasi untuk setiap sumber, termasuk GitHub Enterprise.

## Navigasi ringkas dan nama dependensi

Menu samping halaman Modul kini menyesuaikan lebarnya secara dinamis dengan item terpanjang, sama seperti navigasi Dokumentasi, bukan menggunakan lebar tetap. Administrasi menerjemahkan dependensi komponen yang hanya disimpan sebagai UUID menjadi nama gateway, adapter, serta modul bawaan atau eksternal yang terpasang, sekaligus mempertahankan tautan ke komponen tersebut. Filter status dan kategori menandai setiap pilihan aktif dengan jelas, dan administrator dapat menggabungkan beberapa kategori untuk menyertakan modul yang cocok dengan salah satu tag terpilih.

## Memperkuat aktivasi modul runtime

Bootstrap modul eksternal kini memiliki batas waktu yang aman, modul yang gagal dinonaktifkan, kapabilitas server yang dideklarasikan divalidasi sebelum aktivasi, dan rute SPA tidak dapat memuat kapabilitas dari penyedia yang tidak aktif. Deskriptor bahasa Study diperbarui setelah pembaruan modul. Bootstrap yang melewati batas waktu juga dicegah mendaftarkan rute atau kapabilitas setelah tenggatnya.

## Membuka pengaturan modul dengan cepat

Modul terpasang yang mendeklarasikan preferensi yang dapat diedit administrator kini menampilkan kontrol pengaturan SVG bertema tepat di sebelah kanan menu opsi lanjutan. Kontrol ini membuka popup konfigurasi yang sudah ada agar nilai dapat diubah dan disimpan.

## Menyelesaikan setiap dependensi komponen

Bootstrap gateway kini mempertahankan metadata UUID manifes bahkan untuk komponen tanpa dependensi, sehingga Administrasi menyelesaikan setiap UUID menjadi nama dan tautan komponennya. Tautan adaptor membuka gateway pemilik dan menggulir ke adaptor, tautan modul membuka detail modul, dan pemeriksaan repositori mewajibkan dependensi manifes berbasis UUID saja.

## Memisahkan validasi kapabilitas peramban

Aktivasi modul kini memvalidasi kapabilitas server dan peramban melalui konteks runtime pemiliknya masing-masing. Kebutuhan khusus peramban dalam namespace `ui:` diselesaikan terhadap penyedia registri UI yang aktif saat aktivasi dan kembali sebelum rute SPA dipasang, bukan dilewati atau dicari dalam konteks server.

## Menstabilkan bidang konfigurasi modul

Popup konfigurasi modul kini memakai geometri bidang lebar penuh yang konsisten dan kontrol boolean yang sejajar. Setiap deskripsi bidang yang dideklarasikan ditampilkan melalui popup informasi yang dapat digunakan kembali di samping label, tanpa mengubah tinggi formulir atau perataan input.

## Menjaga kontrol ketersediaan tetap tunggal

Adaptor profil kini mengklaim slot menu ketersediaan secara sinkron sebelum memuat gaya, terjemahan, atau templat. Instans plugin navbar yang berjalan bersamaan menggunakan ulang slot tersebut, menghapus duplikat lama, dan melepaskan klaim yang gagal agar dapat dicoba kembali, sehingga dropdown ketersediaan tidak lagi berlipat setelah penyegaran modul atau SPA.

## Menerapkan pengaturan modul dengan sengaja

Pengaturan modul kini memfokuskan kontrol formulir pertama alih-alih membuka deskriptornya dan hanya menampilkan umpan balik sukses setelah Simpan selesai. Cognis merender bidang yang dideklarasikan dalam manifes, memuat nilainya dari endpoint milik modul `GET /api/v1/modules/<id>/config`, dan menulis perubahan dengan `PUT` ke endpoint tersebut sehingga modul tetap menjadi satu-satunya otoritas untuk validasi, penerapan, dan penyimpanan.

## Gunakan endpoint konfigurasi milik modul

Cognis kini merender bidang yang dideklarasikan manifes modul sambil memuat dan menyimpan nilai melalui endpoint konfigurasi `GET` dan `PUT` milik tiap modul. Modul tetap bertanggung jawab untuk memvalidasi, menerapkan, dan menyimpan pengaturan operasionalnya; Cognis tidak lagi mempertahankan konfigurasi paralel berbasis preferensi.

## Berikan proses logging dan umpan balik host kepada modul

Konteks server modul kini menulis entri terlingkup ke pencatat aplikasi. Modul browser dapat memakai kapabilitas host untuk logging server terautentikasi, toast bertema, dan popup kesalahan runtime alih-alih membiarkan kegagalan operasional hanya di konsol browser.

## Segarkan kanal rilis yang terpasang

Penyegaran Marketplace kini membaca cabang atau rilis aktif modul terpasang sebelum nilai bawaan repositori, termasuk manifes, versi, README, dan aset presentasinya. Penyegaran mempertahankan tampilan beranda, menjaga tampilan detail yang terbuka tetap dipilih, dan menggambar ulang aksi mengambang berdasarkan status siklus hidup terbaru.

## Sediakan klien UI modul dan konfigurasi terlokalisasi

Profil, Pesan, Berkas, dan Berbagi kini menerbitkan klien browser sebagai kapabilitas UI aktif, sehingga rute eksternal dapat memakai data milik gateway tanpa berlomba dengan startup navbar atau memanggil endpoint gateway secara langsung. Bundel bahasa modul terpasang tetap tersedia sebelum bootstrap, dan pengaturan modul menyelesaikan string tersebut sambil membaca serta menulis endpoint `/config` milik modul.

## Tunggu semua klien browser modul

Pemasangan modul langsung dan melalui router kini menunggu setiap penyedia kapabilitas navbar aktif sebelum mengimpor UI modul, sehingga Files, Profile, Messages, Share, umpan balik, dan klien host lain yang dideklarasikan telah siap. Dokumentasi kini memiliki struktur kanonis tersembunyi dan audit konvensi heading otomatis untuk setiap dokumen nyata non-changelog.

## Memuat penyedia kapabilitas mandiri dan navbar bersama-sama

Katalog penyedia browser kini mencakup klien berbasis navbar dan penyedia host mandiri. Karena itu, rute modul menerima klien Files dan kapabilitas umpan balik sebelum mount, alih-alih hanya mengandalkan penemuan navbar.

## Menjaga pengaturan modul tetap ter-mount sekali

Halaman Modul kini membatalkan lingkup interaksi pemuatan langsung sebelumnya sebelum remount SPA. Membuka rute detail modul tidak lagi menyisakan handler pengaturan dari tampilan beranda, sehingga satu klik hanya membuka satu popup.

## Mendeteksi pembaruan modul pada cabang default

Penyegaran katalog kini membandingkan commit dan versi terpasang dengan kepala cabang yang dipilih. Commit baru pada cabang default menghasilkan tindakan Perbarui meski tanpa kenaikan versi, sedangkan versi manifes yang lebih baru menghasilkan tindakan Upgrade dan indikator versi tersedia.

## Menstabilkan siklus penyegaran kapabilitas dan navbar

Penyegaran penuh yang terautentikasi kini memuat penyedia kapabilitas melalui cookie sesi sebelum modul di-mount, sementara plugin navbar visual menunggu shell dasbor tersedia. Kapabilitas browser bernama seperti `share:openPopup` diselesaikan melalui registri UI tanpa bergantung pada prefiks, dan Messages serta Shares pulih dengan benar setelah impor penyedia dini.

## Menjaga gaya kehadiran profil dan pergantian modul tetap aktif

Kapabilitas avatar profil kini memuat stylesheet ketersediaannya sendiri sebelum hidrasi, sehingga kartu kehadiran milik modul tetap dibatasi dan indikator statusnya kembali terlihat. Pengaktifan modul juga menyegarkan status runtime terpasang sebelum memvalidasi pengganti, jadi menghapus, memasang ulang, dan mengaktifkan modul tidak lagi memerlukan restart server.

## Mencoba ulang kapabilitas browser setelah autentikasi sesi

Pemuatan halaman langsung dan SPA kini memuat ulang penyedia UI host setelah alur autentikasi membentuk sesi browser. Halaman yang dipulihkan melalui cookie tidak lagi melanjutkan mount modul setelah permintaan penyedia awal yang belum terautentikasi, dan kapabilitas pemuat navbar kini menjalankan pemuat plugin navbar, bukan hanya pemuat penyedia.

## Mewajibkan konfigurasi modul sebelum pengaktifan

Deskriptor pengaturan modul kini dapat mendeklarasikan `required: true`. Halaman Modul membaca endpoint `/config` milik modul sebelum mengaktifkan dan memblokir pengaktifan selama nilai string, angka, atau boolean yang wajib belum ditetapkan; kontrol teks dan angka yang wajib juga ditandai untuk validasi formulir yang aksesibel.

## Memerlukan persetujuan untuk risiko integritas modul

Setiap berkas modul diperiksa sebelum pengaktifan. Cognis memblokir pengaktifan dan menampilkan berkas yang hilang, deklarasi SHASUM yang tidak ada, serta ketidakcocokan checksum dalam peringatan risiko. Hanya tindakan tegas “Saya memahami risikonya” yang mengizinkan server melanjutkan, dan persetujuan tersebut dicatat.

## Mengonfigurasi modul yang baru diaktifkan secara transaksional

Modul nonaktif tidak lagi gagal diaktifkan ketika rute `/config` milik modul belum di-mount. Cognis terlebih dahulu menyelesaikan permintaan pengaktifan yang terlindungi, lalu membuka pengaturan wajib segera setelah rute modul tersedia. Membatalkan atau menggagalkan penyiapan akan menonaktifkan modul kembali sehingga modul tidak pernah dibiarkan aktif tanpa konfigurasi wajib.

## Mengecualikan metadata instalasi dari pemeriksaan integritas modul

Metadata `.cognis-install.json` yang dihasilkan kini dikecualikan dari pemeriksaan kelengkapan SHASUM, termasuk salinan dalam jalur ekstraksi bertingkat. Peringatan integritas tetap berfokus pada berkas yang dikirim modul, bukan catatan instalasi Cognis.

## Mengonfigurasi modul nonaktif sebelum aktivasi

Setiap popup pengaturan modul kini memuat dan menyimpan nilai melalui endpoint `/config` milik modul dan pembaca nilai formulir bertipe yang sama. Saat pengaturan dibuka untuk modul nonaktif, Cognis memasang rute hanya selama operasi konfigurasi lalu memulihkan keadaan nonaktif, sehingga menyimpan kunci API tidak mengaktifkan modul secara diam-diam.

## Menyelesaikan penyiapan wajib setelah respons aktivasi kosong

Alur aktivasi langsung kini melanjutkan penyiapan konfigurasi wajib ketika endpoint aktivasi mengembalikan respons sukses kosong yang valid. String, boolean, dan angka yang dikirim menggunakan mekanisme konfigurasi yang sama dengan ikon pengaturan pada detail modul; penyiapan yang gagal atau dibatalkan tetap mengembalikan modul ke keadaan nonaktif.

## Menstabilkan avatar kehadiran dan lampu status

Kapabilitas avatar profil kini menyediakan geometri terbatasnya sendiri untuk gambar, inisial, dan indikator ketersediaan, bukan bergantung pada CSS modul. Avatar kehadiran tetap bulat dan terbatas pada halaman modul eksternal, sementara avatar tertaut, tidak tertaut, dan bilah navigasi semuanya memperoleh lampu status yang terlihat.

## Membuat pembersihan pencopotan modul eksplisit

Pencopotan kini selalu menghapus konfigurasi lokal checkout dan meminta konfirmasi sebelum penghapusan. Kotak centang opsional meneruskan `deleteContent: true` ke hook pencopotan modul untuk menghapus konten secara permanen; pembersihan pengaturan tetap berjalan pada setiap pencopotan sehingga pemasangan ulang memerlukan konfigurasi kembali.

## Menyajikan penyedia UI Files dari jalur kanonis

Gateway Files kini mendaftarkan direktori UI dengan kunci gateway `files` yang melayani `/static/gateways/files/*`. Mount modul langsung dan SPA dapat mengimpor `provider.js` secara andal sebelum menyelesaikan `files:uiClient`.

## Amankan instalasi dan aset marketplace

Aset marketplace kini memiliki batas unduhan ketat dan memerlukan autentikasi administrator. Validasi UUID dan ID modul, serialisasi instalasi per modul, perlindungan rute runtime, serta pelaporan kegagalan aktivasi mencegah status siklus hidup yang tidak aman atau menyesatkan.

## Pulihkan aset dan konfigurasi modul

Aset marketplace terautentikasi kini dimuat melalui klien API, bukan permintaan media browser tanpa autentikasi. Pengaturan modul wajib memakai pembuat formulir yang dapat digunakan ulang, mendukung bidang rahasia tersembunyi, tetap tersedia setelah dikonfigurasi, dan dipertahankan saat modul dinonaktifkan.

## Stabilkan aset marketplace SPA

Ilustrasi marketplace terlindungi tidak pernah ditetapkan langsung ke elemen media browser. Navigasi SPA kini membatalkan pemuatan aset yang usang, menekan peristiwa otorisasi aset turunan, dan mencabut URL objek yang terlambat tanpa memunculkan popup kesalahan runtime.

## Lengkapi kontrol sumber modul

Pengaturan sumber modul memakai pembuat formulir bersama dan menyediakan slider Pindai Repositori Privat yang mewajibkan PAT. Perubahan kanal rilis tidak lagi menganggap checkout sementara sebagai konflik ID, dan Cognis menyajikan dokumen rekomendasi bawaan yang dapat dikonfigurasi.

## Pertahankan kata sandi modul saat pembaruan

Pengaturan modul bertipe `password` kini menampilkan masker nilai tersimpan yang tersembunyi dan memenuhi validasi wajib melalui respons status terkonfigurasi modul. Masker yang tidak berubah mengirim pengganti kosong agar modul mempertahankan kata sandi tersimpan. Indikator pemuatan marketplace tetap sebaris sementara tindakan di sebelahnya dipadatkan, dan pelaporan gangguan koneksi dideduplikasi di seluruh bundel UI.

## Pulihkan rekomendasi dan lokalkan metadata marketplace

UUID rekomendasi yang dipublikasikan tetap tersedia dalam katalog bawaan. Kartu, detail, kategori, dan tag marketplace kini menyelesaikan kunci pelokalan dari setiap manifes melalui bundel string modul yang dideklarasikan. Modul yang tidak mencantumkan `ui.stringsBaseUrl` kini otomatis memakai bundel standar `ui/languages`; nilai yang tidak terselesaikan tetap terlihat dan tidak menjadi teks kosong. URL objek gambar modul kini tetap tersimpan sepanjang transisi SPA untuk mencegah kilatan gambar pengganti; varian README terpasang mengikuti bahasa UI aktif dengan fallback bahasa Inggris. Penginstal tidak lagi memperlakukan alias kompatibilitas `README.md` opsional di akar sebagai berkas integritas wajib sehingga alias tersebut dapat berupa symlink ke README bahasa Inggris yang dilokalkan. Tamu berbagi terbatas kini memuat penyedia kapabilitas UI host yang aktif setelah autentikasi dan sebelum modul bersama dipasang, sehingga perenderan avatar profil pulih tanpa mengirim permintaan penyedia sebelum token tamu tersedia.

## Perbaiki administrasi modul terautentikasi

Penemuan penyedia kapabilitas kini menunggu sesi pengguna yang sudah masuk. Filter modul meninggalkan URL detail, pengaturan sumber menerima dependensi pelokalannya secara eksplisit, dan pencopotan menghapus konfigurasi modul sebelum instalasi dihapus. Teks penghapusan data tidak lagi berasumsi tentang data yang disimpan modul.

## Lampu status profil dipulihkan

Shell dasbor kini menginisialisasi penyempurnaan akun yang telah masuk dengan benar saat kapabilitas sesi tamu melaporkan sesi terautentikasi biasa, sehingga lampu ketersediaan kembali tampil di atas avatar navigasi.

## Kanal rilis disegarkan tanpa singgahan

Paginasi repositori Marketplace kini melewati singgahan HTTP perantara agar penyegaran manual segera mengambil cabang dan tag modul yang baru dibuat.

## Kapabilitas dan kontrol berbagi diseragamkan

Perender tamu berbagi kini menerima kapabilitas profil mandiri dan gaya avatar yang telah dimuat sepenuhnya sebelum dipasang. Kontrol berbagi milik gateway secara konsisten menampilkan label Bagikan yang dilokalkan di samping ikon berbagi kanonis.

## Kepemilikan UI diperjelas

Pembersihan rute SPA kini mempertahankan stylesheet milik shell. Kontrak modul memisahkan UI dan navigasi pakai ulang milik host secara jelas dari gaya konten dengan namespace modul.

## Kegagalan instalasi dilindungi

Polling instalasi modul kini mengembalikan kode galat publik yang stabil tanpa mengekspos detail internal sistem berkas, repositori, atau validasi.

## Prasyarat modul dipulihkan

Alias README konvensional di direktori akar tidak lagi mengikuti pemeriksaan integritas modul, pemeriksaan konfigurasi modul nonaktif tidak lagi menampilkan rute hilang yang diharapkan sebagai galat, dan gateway Share kini menerbitkan kapabilitas pemicu browser kanonis untuk modul dependen.

## Penyedia halaman bersama disegarkan

Halaman berbagi kini menyegarkan penyedia kapabilitas host setelah mengaktifkan sesi tamu terbatas, dan Cognis menerbitkan pemuat sumber daya runtime tervalidasi yang dibutuhkan halaman modul.

## Navigasi dan UI modul distabilkan

Tautan navigasi utama kini dapat diseret ke urutan yang disimpan per akun. Satu konteks kapabilitas browser kini mencakup aset terkompilasi dan statis, mempertahankan penyedia profil selama navigasi modul, sedangkan kontrol Bagikan memakai aset Bagikan bertema yang telah ditetapkan.

## Menu tindakan modul tetap stabil

Tindakan modul lanjutan tidak lagi mengganti pemicu hamburger dengan indikator pemuatan saat tindakan berjalan. Tombol Bagikan kini menggunakan ikon tautan yang sama dengan kontrol penyalinan tautan berbagi kanonis.

## Nonaktifkan modul secara atomik dan perketat batas siklus hidup

Menonaktifkan modul kini menghapus navigasi, kontribusi UI, rute, alur, kait, dan kapabilitasnya sebelum permintaan siklus hidup selesai. Aktivasi yang gagal dibatalkan, konfigurasi tetap tersedia hingga pembersihan berhasil, aset marketplace disajikan dari penyimpanan cakram terbatas, setiap prefiks API gateway yang diklaim dilindungi, dan catatan perubahan dikecualikan dari hash integritas sambil tetap dirender dengan aman.

## Aktifkan pengurutan navigasi secara sengaja

Setiap entri navigasi utama kini memiliki pegangan enam titik. Tautan mempertahankan penunjuk normal dan tidak dapat diatur ulang sampai pegangannya diklik; entri yang bergeser dianimasikan selama penyeretan dan urutan disimpan saat dilepas. Dokumentasi modul eksternal kini mengikuti templat kontributor serta menjelaskan penonaktifan atomik dan pembersihan penghapusan secara akurat. Fixture regresi antrean SMTP kini menggunakan timer pengujian yang tidak menahan proses sehingga rangkaian pengujian lengkap dapat berakhir setelah pemeriksaan.

## Komit

- [c685eda](https://github.com/Cognis-Labs-HQ/Cognis/commit/c685eda06183d56a3a250df8b66178db1e8553d6)
