# Berbagi dengan pengguna Cognis

## Popup berbagi kini mendukung penerima pengguna

Cari pengguna Cognis di popup bersama, tambahkan mereka ke berbagi baru dengan akses baca, tinjau penerima pada berbagi yang sudah ada, dan cabut akses tanpa meninggalkan popup. Semua pencarian penerima dan perubahan berbagi dirutekan melalui gateway Share.

## Tautan dan Pengguna kini menjadi adapter gateway Share

Popup menampilkan metode yang didukung pada baris atas dan membuka halaman khusus milik metode untuk berbagi Tautan atau Pengguna. Riwayat berbagi difilter berdasarkan metode terpilih, sementara kedua jenis dapat digunakan bersamaan pada sumber daya yang sama.

## Setiap metode berbagi menampilkan kontrolnya sendiri

Berbagi Tautan menampilkan penyesuaian label dan masa berlaku, sedangkan berbagi Pengguna menampilkan pencarian penerima, izin baca/tulis, dan masa berlaku. Mengganti metode juga mengganti riwayat yang terlihat dengan berbagi dari jenis tersebut.

## Halaman metode berbagi kini dimuat dengan benar

Gateway Share kini mendaftarkan direktori statis setiap adapter yang ditemukan, sehingga halaman popup Tautan dan Pengguna dimuat tanpa respons 404.

## Mengganti metode kini mengganti halaman

Popup kini hanya memasang halaman adapter yang dipilih. Masukan tautan tidak ada saat berbagi dengan pengguna, sedangkan pencarian pengguna dan kontrol izin tidak ada saat membuat tautan.

## Berbagi mendukung waktu kedaluwarsa, mode akses, dan kata sandi

Halaman Tautan dan Pengguna kini memakai pemilih tanggal/waktu kedaluwarsa opsional serta perlindungan kata sandi opsional. Komponen juga dapat mendeklarasikan mode akses Tautan, sehingga Kalender membedakan tautan hanya-baca dan baca/tulis serta hanya memberikan kemampuan yang sesuai.

## Penemuan kalender terlindungi

Klien kalender kini menerima tantangan autentikasi saat memeriksa berbagi kalender valid yang dilindungi kata sandi, bukan respons tidak ditemukan yang tidak dapat dibedakan.

## Pemeriksaan token yang aman

Share dapat memeriksa keberadaan dan masa aktif token tanpa melewati kata sandinya, sehingga Calendar dapat meminta kredensial sebelum mengirim konten berbagi.

## Metadata klien yang jelas

Umpan kalender kini menerbitkan nama kalender serta status baca-saja atau baca-tulis, sementara penemuan CalDAV mempertahankan alamat berbagi yang telah diautentikasi.

## Berbagi CalDAV baca-tulis

Klien kalender dapat membuat, mengubah, dan menghapus acara melalui berbagi tautan baca-tulis dan berbagi pengguna terautentikasi. Berbagi baca-saja tetap menolak perubahan.

## Kolom wajib yang konsisten

Kata sandi berbagi privat kini memakai penanda kolom wajib dan validasi formulir standar tanpa pesan peringatan terpisah.

## Sumber daya ICS bernama

Varian ICS kini berakhir dengan nama kalender aktif yang dikodekan dan `.ics`. Alamat lama yang hanya berisi token dialihkan setelah autentikasi ke sumber daya bernama agar klien impor memperoleh nama kalender yang benar.

## Baca-saja yang ditegakkan

Berbagi ICS dan CalDAV baca-saja menolak setiap metode WebDAV yang mengubah data dengan `403` dan respons `DAV:need-privileges`. Berbagi CalDAV baca-tulis tetap menerima perubahan acara yang didukung.

## Ikon kalender diperbarui

Kalender publik kini menggunakan SVG globe yang mengikuti tema, dan ikon berbagi diperbesar sepuluh persen agar lebih mudah dikenali.

## Penghapusan kalender lebih aman

Tindakan hapus kini berada bersama tindakan popup lainnya dan memerlukan konfirmasi sebelum kalender beserta berbagi terkait dihapus.

## Visibilitas sesuai tema

Kalender bersama hanya-baca kini memakai ikon mata dengan keterangan saat diarahkan bertuliskan “Hanya-baca”, sedangkan kalender privat memakai ikon gembok aman. Kedua ikon memiliki varian khusus untuk tema terang dan gelap.

## Autentikasi tetap diwajibkan

Alamat ICS dan CalDAV yang dilindungi kata sandi tidak lagi memuat kredensial turunan. Klien kalender harus memakai kata sandi berbagi sebelum menerima data kalender.

## Izin berbasis standar

Penemuan CalDAV kini menerbitkan hak pengguna aktif dan kumpulan komponen VEVENT sesuai RFC. Pemeriksaan WebDAV untuk ICS menerbitkan hak baca-saja karena umpan langganan tidak mendukung penulisan.

## Nama kalender pada alamat

Varian CalDAV memuat nama kalender yang dikodekan agar klien dapat memperoleh nama yang ramah dari alamat koleksi tanpa mengungkap bahan autentikasi.

## Kepemilikan kalender jelas

Kalender bersama kini memakai ikon berbagi yang mengikuti tema. Menghapus kalender milik sendiri akan menghapus tautan, berbagi pengguna, dan salinan penerima, sedangkan kalender bawaan tetap dilindungi. Penerima dapat menghapus kalender yang diterima untuk menghapus entri penerimanya saja; berbagi dihapus saat penerima terakhir keluar.

## Identitas kalender pada berbagi

Berbagi kalender kini menyimpan nama kalender sehingga tautan dan surel menampilkan kalender, bukan pengenal internal berbagi.

## Hak akses untuk klien

Klien CalDAV menerima hak baca-saja atau baca-tulis yang jelas dan tidak mencoba menulis ke berbagi baca-saja.

## Berbagi privat lebih aman

Kalender privat mewajibkan kata sandi berbagi. Surel berbagi memuat pengirim, nama kalender, tautan yang terlihat, dan tombol buka.

## Berbagi Web kalender andal

Berbagi Web kalender kini menyelesaikan pemuatan secara pasti, menampilkan konten tamu, dan menerapkan kemampuan baca atau tulis pada operasi acara tamu.

## Mode akses kalender jelas

Varian Web, ICS, dan CalDAV menampilkan mode hanya baca atau baca-tulis, sementara respons kalender memberitahukan mode akses efektif kepada klien.

## Riwayat berbagi dapat disunting

Memilih berbagi memulihkan nilainya ke formulir adapter yang sesuai dan memperbarui catatan yang ada. Berbagi tautan menyediakan pengiriman email bertemplat, sedangkan pilihan pengguna mempertahankan kartu pratinjau profil tanpa nama pengguna yang terlihat.

## Nama kalender terkini

Alamat klien kalender kini memperoleh nama koleksi dari catatan Calendar gateway terkini. Metadata berbagi hanya dipakai ketika sumber daya aktif tidak tersedia.

## Berbagi pengguna baca-saja

Adapter berbagi Pengguna kini menghapus kemampuan menulis saat izin Baca dipilih. Penemuan CalDAV hanya menerbitkan hak baca sehingga klien kalender menonaktifkan penyuntingan.

## Berbagi pengguna ganda diblokir

Sebuah objek tidak dapat dibagikan kepada pengguna yang sama lebih dari sekali, meskipun mode aksesnya berbeda atau berbagi yang ada diedit untuk menargetkan pengguna tersebut.

## Kalender hanya-baca lebih jelas

Kalender bersama yang hanya-baca menampilkan ikon gembok dalam daftar kalender dan tidak tersedia sebagai tujuan di penyusun acara. Informasi kalender bersama kini menegaskan bahwa penerima tidak dapat mengedit nama kalender.

## Pengiriman SMTP langsung

Permintaan email bertemplat umum kini menargetkan pengirim SMTP yang aktif secara langsung dan tidak bergantung pada preferensi kategori notifikasi, sehingga email berbagi yang valid tidak dilewati.

## Validasi pengiriman yang jelas

Tindakan konfirmasi pada dialog email kini berlabel Kirim dan menampilkan peringatan saat belum ada penerima yang ditambahkan.

## Templat dari komponen

Komponen kini dapat mendaftarkan templat email melalui kemampuan gateway Notifikasi dan memilih templat tersebut saat meminta pengiriman.

## SMTP netral penyedia

Adapter SMTP kini hanya menyediakan pengiriman email berbasis templat secara umum dan tidak mengenal istilah maupun isi pesan Share. Share memiliki dan mendaftarkan templat emailnya sendiri.

## Riwayat langsung diperbarui

Berbagi baru kini muncul dalam riwayat tautan segera setelah gateway Share mengonfirmasi pembuatannya, tanpa bergantung pada tindakan Simpan Perubahan di editor Kalender.

## Penyegaran riwayat yang andal

Permintaan riwayat yang gagal tidak lagi mengganti daftar yang terlihat dengan hasil kosong, sehingga berbagi yang telah dikonfirmasi tetap tersedia saat sinkronisasi dicoba kembali.

## Berbagi privat menjelaskan kewajiban kata sandi

Berbagi tautan kalender privat kini memakai gelembung informasi standar untuk menjelaskan alasan kata sandi diperlukan.

## Kata sandi aman dapat dibuat langsung

Kontrol bergaya muat ulang di samping kolom kata sandi membuat kata sandi berbagi yang aman dan mudah dibaca tanpa meninggalkan formulir.

## URL berbagi kalender bersifat kanonis

Tautan ICS dan CalDAV baru langsung menyertakan nama kalender dan tidak lagi mempertahankan rute kompatibilitas yang hanya berisi token.

## Email berbagi khusus

Berbagi tautan kini dapat mengirim email kepada beberapa penerima bertanda melalui pemberi tahu SMTP dengan pesan dan tombol tindakan khusus. Pengiriman per pengirim dan penerima dibatasi sekali setiap 12 jam.

## Berbagi kalender interaktif

Varian Web kini menampilkan satu kalender tamu dan hanya mengizinkan pembuatan acara jika berbagi memberikan akses tulis.

## Berbagi dengan orang lebih jelas

Hasil pencarian muncul tepat di bawah kolom pencarian, orang terpilih mempertahankan kartu profil lengkap, dan keadaan kosong tidak lagi menyebut tautan klien kalender.

## Dialog email terpisah

Tindakan email kini muncul di bawah judul setiap berbagi tautan dan membuka dialog penerima khusus tanpa mengalihkan formulir berbagi ke mode sunting.

## Pembatalan pembaruan mudah

Formulir pembaruan tautan dan pengguna kini memiliki tindakan tutup yang membersihkan nilai yang dipulihkan dan langsung kembali ke mode pembuatan.

## Label varian lebih sederhana

Tombol varian kalender menggunakan label ringkas Web, ICS, dan CalDAV, sementara aturan akses tetap tersedia bagi klien kalender melalui metadata respons.

## Pencabutan dan kedaluwarsa

Objek berbagi pengguna yang telah dikirim akan dihapus saat berbagi dicabut atau kedaluwarsa. Penulisan berikutnya ditolak karena pemetaan penerima tidak lagi aktif.

## Perilaku kalender

Lencana izin mengikuti mode akses yang dipilih sebelum pembuatan. Nama kalender bersama mengizinkan nama lokal sepanjang 30 karakter sambil mempertahankan akhiran pemberi berbagi yang tidak dapat diubah. Tanggapan untuk acara yang sudah tersimpan di kalender bersama memperbarui acara global tersebut dan tidak mengimpor duplikat.

## Tindakan berbagi memuat halaman berbagi lengkap

Membuka notifikasi Berbagi kini melakukan navigasi dokumen penuh untuk tindakan `/share/…`. Dengan demikian, halaman berbagi memasang kait autentikasi, keyring kata sandi, dan perendernya alih-alih diabaikan oleh router SPA dasbor.

## Kata sandi berbagi siap dikirim

Setelah membuat berbagi tautan atau pengguna yang dilindungi kata sandi, dialog menampilkan kata sandi dalam kolom tersembunyi dengan kontrol tampilkan standar dan tindakan salin.

## Riwayat berbagi memiliki waktu pembuatan dan penyuntingan formulir

Setiap kartu berbagi menampilkan waktu pembuatannya. Memilih kartu berbagi pengguna memuat penerima, izin, kedaluwarsa, dan nilai lainnya ke formulir berbagi untuk pembaruan yang jelas, bukan menyediakan kontrol penyuntingan di dalam kartu riwayat.

## Jumlah pengguna dan tindakan notifikasi bekerja andal

Tindakan berbagi pengguna memperbarui jumlah penerima saat orang dipilih atau dihapus. Membuka notifikasi berbagi dalam aplikasi kini dapat menandai notifikasi tersebut sudah dibaca melalui rute kotak masuk kanonis.

## Berbagi terlindungi meminta kata sandi, bukan terlihat hilang

Gateway Berbagi kini membedakan token valid yang dilindungi kata sandi dari token tidak valid. Halaman berbagi menerima tantangan autentikasi, memeriksa keyring terenkripsi, meminta kata sandi bila diperlukan, menyimpan kata sandi terverifikasi, lalu memuat objek bersama.

## Akses notifikasi tidak lagi mengganti status masuk

Penerima yang sudah masuk mempertahankan token akun saat membuka notifikasi berbagi. Token berbagi terbatas yang terpisah diberikan langsung kepada perender komponen untuk operasi API bersama, sehingga penulisan Kalender tetap dikendalikan izin tanpa mengeluarkan pengguna.

## Warna kalender tetap lokal

Penerima dapat mengubah warna kalender bersama tanpa mengubah kalender pemilik. Nama, pengaturan berbagi, dan penghapusan tetap dikendalikan pemilik.

## Izin acara dinyatakan jelas

Kalender hanya-baca tidak lagi menampilkan kesalahan pengeditan umum. Penerima dengan akses tulis dapat membuat, memperbarui, dan menghapus acara, tetapi tidak dapat menjawab undangan atau mengubah respons peserta melalui kalender bersama.

## Kata sandi berbagi tetap tersedia

Saat gantungan kunci terenkripsi terkunci, kata sandi berbagi yang baru diverifikasi tetap tersimpan aman di memori selama sesi aktif, bukan menghasilkan kesalahan penyimpanan.

## Detail keamanan SMTP terbuka dengan andal

Metode autentikasi dua faktor SMTP yang telah dikonfigurasi dapat membuka jendela pengelolaannya meskipun tidak ada detail rahasia yang dapat ditampilkan.

## Autentikasi klien satu langkah

Varian klien kalender yang dilindungi kata sandi kini membawa kredensial transportasi terbatas yang dapat dibuat ulang, sehingga klien tidak menampilkan permintaan kata sandi kedua.

## Identitas kalender yang dikenali

Alamat koleksi CalDAV memuat nama kalender, sementara penemuan tetap menerbitkan nama tampilan serta hak baca-saja atau baca-tulis yang berlaku.

## Perlindungan kata sandi dipertahankan

Kredensial transportasi diturunkan dari berbagi terlindungi dan tidak membocorkan kata sandi berbagi yang dipilih. Autentikasi kata sandi langsung tetap didukung.

## Buka berbagi tanpa meninggalkan halaman

Notifikasi berbagi pengguna kini membuka permintaan kata sandi di dasbor yang sedang masuk dan memakai kembali kata sandi yang tersimpan di gantungan kunci tanpa membuka halaman berbagi publik.

## Kalender bersama masuk ke akun penerima

Setelah otorisasi berhasil, Calendar menambahkan kalender bersama ke akun penerima dan langsung membukanya. Calendar tetap menangani pembatasan hanya-baca atau baca-tulis serta sinkronisasi konten.

## Berbagi pengguna memberi tahu penerima

Saat item dibagikan kepada pengguna Cognis, notifikasi kategori Berbagi kini dikirim sesuai preferensi notifikasi setiap penerima. Notifikasi membuka item bersama secara langsung.

## Kata sandi tetap terenkripsi dalam keyring

Berbagi pengguna yang dilindungi kata sandi meminta penerima membuka item sekali lalu menyimpan kata sandi terverifikasi dalam keyring peramban yang dienkripsi dari kata sandi masuk. Komponen mengakses entri melalui kapabilitas keyring bernama, bukan penyimpanan teks biasa.

## Penguncian ulang dapat dikonfigurasi

Pengaturan Keamanan kini memungkinkan keyring tetap terbuka hingga keluar atau terkunci otomatis setelah periode yang dipilih. Izin baca-saja dan baca-tulis tetap mengatur data komponen bersama.

## Paket internal dipasang secara lokal

Semua batas dependensi internal Cognis kini mencakup versi yang tersedia di repositori ini sehingga npm tidak lagi mencoba mengunduh paket ruang kerja privat dari registri publik.

## Pembaruan versi tetap atomik

Panduan kontribusi kini mewajibkan versi, manifes, spesifikasi dependensi, berkas kunci, dan seluruh indeks versi terjemahan diperbarui serta diverifikasi bersama-sama.

## Varian tautan untuk kalender

Berbagi kalender kini menyediakan varian Web, ICS, dan CalDAV dengan satu token gateway Share agar peramban dan klien kalender menerima format yang sesuai.

## Perbaikan popup berbagi

Pencabutan berbagi kalender kini diotorisasi dengan benar, popup Share tidak lagi mengunci editor Kalender, dan pencarian pengguna menampilkan avatar profil yang tertaut.

## Acara bersama tetap akan datang

Acara dari kalender yang diterima kini tetap terlihat di Acara Mendatang, judul menu samping dipusatkan, dan tata letak Kalender tidak lagi dapat disusun ulang melalui pengeditan komposer halaman.

## Keyring pengguna tersinkronisasi

Keyring peramban terenkripsi kini hanya menyinkronkan ciphertext buram melalui endpoint keyring terautentikasi. Pengaturan Pengguna menyediakan halaman Keyring untuk menambah, mengedit, dan menghapus rahasia setelah konfirmasi kata sandi secara eksplisit.

## Rapat dan obrolan memakai keyring

Kata sandi rapat dan kunci enkripsi obrolan yang dibuat otomatis ditambahkan ke keyring. Jika rahasia yang diedit tidak valid, resolusi keyring menghapusnya lalu meminta atau mengambil nilai terkini agar akses tetap berjalan.

## Kontrol dan inventaris keyring

Halaman pengaturan Keyring kini menempatkan penjelasannya dalam popup informasi, menampilkan rahasia tersimpan dalam tabel terstruktur, serta menyediakan kontrol penguncian manual dan pembukaan kunci yang dilindungi kata sandi. Penguncian otomatis kini dikonfigurasi bersama keyring, bukan di halaman Keamanan umum.

## Kata sandi berbagi privat mudah dikenali

Kata sandi yang telah diverifikasi untuk berbagi kalender terlindungi disimpan dengan metadata keyring yang jelas dan disinkronkan sebagai bagian dari brankas terenkripsi. Entri tersebut terlihat dalam inventaris pengguna tanpa membuka teks aslinya kepada server.

## Konfirmasi kata sandi sesuai penyedia

Konfirmasi kata sandi kini dimiliki gateway Autentikasi dan tersedia bagi alur sensitif melalui kemampuan `auth:confirmPassword`. Konfirmasi diteruskan ke penyedia aktif akun, termasuk sumber LDAP yang memiliki ruang nama terpisah, sehingga tidak lagi menganggap setiap akun mempunyai catatan kata sandi lokal.

## Penguncian keyring mengikuti konfirmasi

Pembukaan keyring kini menggunakan permintaan konfirmasi kata sandi sesuai penyedia dari gateway Autentikasi beserta masa berlaku normalnya. Penguncian membatalkan masa konfirmasi tersebut agar permintaan rahasia berikutnya meminta kata sandi akun. Preferensi penguncian otomatis tetap dapat diubah saat brankas terkunci, dan halaman Keyring kini memiliki tata letak responsif yang lebih lapang.

## Rahasia komponen yang dapat diperiksa

Entri keyring kini menyebutkan komponen yang menyimpannya, dapat diperluas dengan klik, dan menyediakan kontrol mata SVG untuk menampilkan rahasia. Membuka pengaturan Keyring otomatis meminta konfirmasi sesuai penyedia dan membuka brankas bila memungkinkan. Entri terkunci tetap terlihat tersamarkan, sedangkan kontrol bertema Batas Waktu Kunci Keyring tetap dikelompokkan dengan labelnya.

## Vault keyring buram berbasis basis data

Envelope keyring terenkripsi kini disimpan secara persisten dalam tabel basis data autentikasi khusus, bukan penyimpanan preferensi umum. Browser hanya mengambil dan mendekripsi envelope saat membuka kunci, sedangkan pengaturan Keyring yang terkunci merender placeholder sintetis tanpa pengenal, metadata, atau nilai rahasia di DOM.

## Validasi ulang akses kalender terlindungi

Setiap pemuatan kalender penerima yang dilindungi kata sandi kini memvalidasi ulang kata sandi berbagi di server. Pemuatan kalender terlebih dahulu membuka dan memeriksa keyring pengguna, meminta kata sandi jika kunci tidak ada atau tidak valid, serta menyediakan pilihan penolakan eksplisit agar penerima dapat memilih untuk tidak menyimpan kata sandi terverifikasi.

## Permintaan rahasia yang ditolak tetap terkunci

Membatalkan permintaan keyring dan rahasia kini membuat objek terlindungi tetap tidak tersedia, bukan melanjutkan dengan akses sebagian. Kalender bersama yang terkunci tampil abu-abu dengan tooltip penjelasan dan mencoba membuka kunci kembali saat diklik. Setelah keyring terbuka, kontrol tambah, edit, hapus, dan tampilkan dapat digunakan bebas tanpa konfirmasi kata sandi akun berulang.

## Kalender bersama tidak lagi berarti undangan acara

Membuat acara pada kalender yang dibagikan kepada pengguna tidak lagi menambahkan semua penerima berbagi sebagai peserta. Penerima tetap dapat melihat acara melalui kalender bersama, sedangkan undangan hanya dikirim kepada peserta yang dipilih secara eksplisit. Halaman Keyring menggunakan kembali vault yang sudah terbuka, dan permintaan vault terkunci kini memakai judul Buka Keyring serta alur tindakan halaman tertunda agar navigasi selesai sebelum popup dibuka.

## Preferensi Penyimpanan Kata Sandi

Dialog berbagi terlindungi kini menanyakan apakah kata sandi akan disimpan ke keyring dengan kalimat positif. Opsi ini dipilih secara default dan dapat dinonaktifkan untuk menggunakan kata sandi tanpa menyimpannya.

## Memindahkan rahasia terenkripsi ke adapter keyring autentikasi wajib

Klien keyring, penyimpanan persisten, dan rute API kini dimiliki adapter Autentikasi wajib. Migrasi preferensi lama dan pengambilan kunci ruang obrolan dalam teks biasa telah dihapus, sehingga konsumen rahasia hanya menyelesaikan kunci melalui keyring terenkripsi.

## Menjaga tanggung jawab berbagi di adapter pemiliknya

Adapter Berbagi Pengguna kini memastikan penerima unik, sedangkan SMTP sendiri mengelola pembatasan laju antrean email. Gateway Berbagi hanya mengorkestrasi kebijakan milik adapter tersebut.

## Menyelaraskan bootstrap keyring dengan arsitektur kapabilitas

Keyring peramban yang dapat digunakan kembali sepenuhnya berada di dalam adapter Autentikasi wajib. Adapter Autentikasi wajib kini memulai sendiri kapabilitas brankas dan rutenya selama penemuan gateway, menerima autentikasi melalui injeksi konteks rute, dan menyertakan dokumentasi milik komponen.

## Memulihkan kepatuhan ukuran sumber dan dependensi

Berkas rute dan pengujian Kalender yang besar telah dipecah menjadi modul terfokus, berkas tersentuh yang terlalu besar kini berada di bawah batas 1.000 baris, dan batas atas dependensi Berbagi sesuai dengan versi workspace yang diuji.

## Menampung seluruh keyring di adapter Autentikasi

Keyring peramban kini berada bersama penyimpanan, rute, manifes, dan dokumentasi adapter. Adapter mendaftarkan direktori UI statisnya sendiri selama penemuan, dan setiap konsumen mengimpor permukaan peramban milik adapter.

## Adapter berbagi dan keyring tampil di Administrasi

Manifest adapter Keyring, Tautan, dan Pengguna kini mengumumkan gateway induk Autentikasi atau Berbagi. Adapter Keyring terenkripsi, Tautan, dan Pengguna yang wajib menyediakan metadata komponen terkunci dan kontrol administrasi kanonis, termasuk permukaan konfigurasi kosong yang valid.

## Pengiriman email menggunakan satu kapabilitas

Pesan uji SMTP, verifikasi pengguna, undangan, pesan masuk sekali pakai, dan pesan verifikasi antrean kini menggunakan kapabilitas ctx `notify:sendEmail` milik adapter. Pengujian rute Administrasi dan verifikasi email memastikan pengiriman kapabilitas berhasil agar regresi tidak lagi muncul sebagai respons `400` tanpa penjelasan.

## Kepemilikan adapter ditemukan secara terpusat

Bootstrap gateway inti kini memperoleh `hasAdapters` dari bidang `gateway` pada setiap manifest adapter. Gateway tidak lagi memerlukan penanda keberadaan adapter yang digandakan dalam manifest atau pendaftaran bootstrap miliknya.

## Kunci ruang diterima secara otomatis

Saat ruang dibuka, kunci ruang yang hilang kini dibuat di server dan hanya dikirim kepada anggota ruang yang telah disetujui. Messages meminta pengguna membuka keyring terenkripsi bila diperlukan, memvalidasi kunci yang dikirim, menyimpannya dengan pengenal kapabilitas ruang, lalu membuka utas terenkripsi.

## Keyring sementara untuk tamu berbagi

Token berbagi yang valid kini membuat identitas tamu terisolasi dengan frasa sandi keyring turunan. Peramban membuka keyring khusus sesi tersebut secara otomatis, menjaganya tetap terbuka selama masa hidup identitas tamu, dan menyimpan rahasia tamu tanpa menyentuh vault pengguna yang masuk. Pembersihan tamu kedaluwarsa menghapus vault keyring sisi server yang sesuai bersama profil tamu.

## Pemuatan pesan menunggu keyring

Proses masuk kini menyimpan akun terautentikasi sebelum membuka keyring terenkripsinya. Messages menggabungkan pembukaan ruang yang bersamaan dan menjeda penyegaran percakapan langsung sampai pengiriman kunci ruang serta dialog pembukaan yang diperlukan selesai, sehingga polling latar belakang tidak lagi menghasilkan penolakan promise karena kunci hilang.

## Keyring mengikuti setiap alur pemuatan komponen

Jalur masuk dengan kata sandi dan autentikasi dua faktor kini membuka keyring pengguna sebelum navigasi dengan tetap menghormati batas waktu penguncian otomatis yang dikonfigurasi. Adapter Messages memiliki alur pemuatan chat bertahap yang menemukan, mengambil, memvalidasi, dan menyimpan kunci ruang; halaman Messages, pencarian global, notifikasi, dan chat mini Meetings semuanya memakai kapabilitas bersama tersebut tanpa mengimpor bagian internal keyring.

## Satu status keyring dan satu dialog pembukaan

Semua pemakai keyring kini berbagi satu kapabilitas permintaan pembukaan dan satu dialog yang sedang berlangsung. Pembukaan yang berhasil langsung berlaku untuk Meetings, Messages, notifikasi, berbagi, dan pengaturan Keyring sampai batas waktu penguncian otomatis yang dikonfigurasi berakhir. Dialog bersama kini menggunakan kata-kata umum tentang keyring, bukan merujuk pada ruang chat.

## Permintaan keyring menjelaskan alasan akses

Setiap permintaan untuk membuka keyring kini wajib menyertakan komponen, tindakan, dan proses. Dialog bersama menampilkan ketiganya, misalnya “Meetings” meminta akses untuk “bergabung” dengan “rapat 123456”, sehingga pengguna memahami alasan rahasia terenkripsi diperlukan sebelum memasukkan kata sandi.

## Login pertama menyiapkan enkripsi keyring

Pada login pertama pengguna, adapter Keyring kini menyumbangkan tahap penyiapan setelah login yang meminta kata sandi khusus keyring secara opsional. Jika dibiarkan kosong, kata sandi akun digunakan. Keyring yang sudah ada dibuka melalui tahap yang sama, sedangkan dialog pembukaan kini hanya menyebut kata sandi keyring dan menampilkan detail permintaan tanpa tanda kutip dekoratif.

## Aktivitas keyring dan kontrol siklus hidup

Permintaan pembukaan memisahkan penjelasan dari petunjuk kata sandi dengan satu baris kosong. Pengaturan Keyring kini menampilkan log aktivitas terenkripsi untuk peristiwa pembukaan, pembacaan, penulisan, penghapusan, pengosongan, dan perubahan kata sandi beserta pengenal dan stempel waktu, serta menyediakan kontrol untuk mengosongkan rahasia tersimpan atau mengubah kata sandi enkripsi. Menghapus pengguna juga membersihkan vault keyring akun tersebut.

## Riwayat keyring lengkap yang dapat dijelajahi

Keyring kini menyimpan seluruh riwayat aktivitas terenkripsi. Pengaturan menampilkan Kunci dan Log sebagai bagian yang dapat diciutkan serta membagi catatan log ke dalam halaman saat brankas terbuka.

## Penghapusan LDAP kini membersihkan keyring

Adapter keyring kini mengikuti alur pembersihan penghapusan pengguna yang sama dengan Kalender dan Pesan, menormalkan pengenal akun LDAP, serta menghapus brankas terenkripsi yang sesuai setelah penghapusan akun tersimpan.

## Brankas terhapus membatalkan salinan peramban

Respons kosong yang berhasil dari API keyring kini menjadi sumber utama. Setelah penghapusan administratif, login berikutnya membuang salinan terenkripsi di peramban, membuka penyiapan keyring pertama, dan tidak dapat memulihkan entri atau log yang telah dihapus.

## Keyring terikat instans akun

Autentikasi kini memberikan pengenal sekunder sementara untuk setiap siklus hidup akun. Keyring menyimpan dan memvalidasi pengenal tersebut, sehingga menghapus lalu membuat ulang nama pengguna LDAP yang sama membersihkan brankas server dan peramban yang usang. Pengaturan keyring juga menyediakan pilihan batas waktu yang diperluas, tooltip informasi guna ulang, dan tindakan pengosongan brankas yang lebih jelas.

## Perlindungan instans akun untuk data pengguna

Data kalender, kelas, chat, profil, preferensi, grafik sosial, dan notifikasi kini terdaftar sebagai pemilik data akun. Autentikasi mencatat instans akun terakhir yang dilayani setiap pemilik dan otomatis memusnahkan catatan usang sebelum akun yang dibuat ulang dapat mengaksesnya.

## Penyiapan keyring setelah tiba di dasbor

Pengguna baru kini tiba di dasbor sebelum dialog penyiapan Keyring Pengguna dibuka. Dialog tersebut menjelaskan bahwa keyring melindungi kata sandi dan kunci enkripsi yang digunakan fitur Cognis. GitHub Actions kini secara eksplisit menjalankan seluruh rangkaian pengujian setelah pemeriksaan tipe.

## Administrasi gantungan kunci mandiri dan dapat dikonfigurasi

Batas penyimpanan dan kekuatan derivasi kata sandi kini dikelola melalui pengaturan adaptor Autentikasi. Adaptor memiliki UI pengaturan, terjemahan, rute, dan dokumentasi teknisnya; petunjuk membuka kunci memakai kunci teks terjemahan yang terpisah.

## Jarak keterbacaan diberlakukan

Baris kosong yang disengaja antara metode kelas Calendar dan SMTP serta blok inisialisasi Jitsi telah dipulihkan. Pemeriksaan keterbacaan kini melindungi batas tersebut.

## Menjaga sinkronisasi berbagi pengguna yang diedit

Perubahan berbagi kini berjalan melalui siklus hidup bertahap agar kalender yang telah dikirim segera mencerminkan penghapusan penerima, perubahan izin, dan masa berlaku terbaru.

## Mempertahankan kata sandi tersimpan dan keyring offline

Kata sandi berbagi yang disimpan kini memakai pengenal token yang sama dengan pencarian. Keyring yang dibuat saat offline diunggah ketika koneksi kembali dan hanya dihapus jika server mengonfirmasi bahwa instans akun telah berubah.

## LDAP menjelaskan kegagalan bind

Penyiapan LDAP kini menerjemahkan kode galat direktori 0x31 menjadi panduan untuk memeriksa DN bind dan kata sandi, sementara penyebab terperinci tetap dicatat secara terstruktur di log server.

## Uji SMTP memakai antrean pengiriman

Pesan uji SMTP kini melewati antrean dan pembatas laju milik adapter. Uji yang gagal memberikan respons khusus yang dapat ditindaklanjuti, bukan kegagalan permintaan umum.

## Server LDAP tersimpan dapat diaktifkan

Adapter autentikasi kini melaporkan status penyiapannya melalui kontrak gateway. Kumpulan server LDAP tersimpan yang lengkap dikenali meskipun bidang dan kata sandi yang disamarkan berada di dalam `servers`.

## Batas adapter dipulihkan

SMTP kini memiliki dan mendaftarkan rute ujinya sendiri, sedangkan rute gateway memakai kontrak gateway alih-alih menyimpan instans adapter notifikasi atau autentikasi. Indeks versi yang dilokalkan kini sesuai dengan setiap manifes komponen.

## Linimasa keanggotaan ruang yang konsisten

Permintaan pesan tidak lagi membuat ruang pesan langsung yang hanya berisi peristiwa. Perubahan keanggotaan dan peristiwa linimasa pasifnya kini bersifat atomik, dan obrolan rapat mencatat peristiwa bergabung untuk setiap peserta yang ditemukan.

## Permintaan keyring hanya saat konten membutuhkannya

Proses masuk kini mencoba kata sandi akun secara oportunistik tanpa membuka dialog keyring bila kata sandinya berbeda. Permintaan buka kunci kontekstual hanya muncul saat komponen benar-benar menyelesaikan konten terlindungi.

## Berbagi kalender dibuka dan dirender sekali

Kata sandi yang telah diverifikasi kini digunakan kembali saat kalender pengguna yang diimpor dimuat. Kalender yang baru diimpor menampilkan notifikasi berhasil, dan tautan kalender publik memasang perender tamu milik Kalender alih-alih berhenti di layar pemuatan.

## Buka kunci obrolan kontekstual bertahan setelah muat ulang

Messages kini mengidentifikasi dirinya sebagai Social Messages saat meminta rahasia obrolan yang ada, menghindari permintaan penyimpanan kedua setelah pembatalan, dan segera memperbarui pratinjau terenkripsi setelah buka kunci. Kunci sesi yang tidak dapat diekstrak memulihkan keyring terbuka setelah muat ulang halaman pada tab yang sama. Tindakan tambah Kalender sedikit lebih besar dan kini bertuliskan “+ Baru”.

## Berbagi portabel dan obrolan rapat terenkripsi diperkuat

Popup Berbagi kini memakai kapabilitas avatar UI opsional dengan inisial sebagai cadangan, sehingga tetap tersedia tanpa Social. Tamu berbagi rapat menerima kunci obrolan otoritatif melalui keyring sementara, kunci ruang tersimpan yang salah diganti, dan brankas keyring terenkripsi besar dikodekan dalam potongan aman. Dokumentasi keyring terlokalisasi dan indeks versi komponen diselaraskan, serta spasi stylesheet Kalender dipulihkan.

## Buka kunci otomatis dan perenderan tautan kalender lengkap

Pemuatan halaman langsung dan penyegaran kini memulai keyring wajib sebelum autentikasi sesi, lalu memulihkan status buka kunci tab secara otomatis atau meminta kata sandi saat konten terlindungi membutuhkannya. Tautan kalender merender satu kartu kalender terisolasi dengan pemilih tampilan dan tabel slot waktu standar; token tulis dapat membuat, mengedit, dan menghapus acara tanpa menampilkan kalender lain atau kontrol dasbor.

## Sesi keyring tamu tanpa kata sandi

Tamu anonim tautan kalender tidak lagi memicu dialog buka kunci keyring akun. Share membatasi pencarian keyring akun dan penyimpanan kata sandi pada sesi akun tervalidasi, sedangkan keyring tamu yang dikirim aktif secara otomatis, tetap terbuka selama sesi tamu, dan dihapus bersama brankas khusus sesinya saat sesi tamu berakhir.

## Kontrol dan pengguliran kalender tamu yang andal

Pengalihan tampilan dan navigasi periode pada tautan kalender kini menggunakan batas interaksi terdelegasi yang stabil dan tetap aktif setelah penyegaran composer. Pengguliran vertikal dibatasi pada kisi slot waktu, bukan kartu widget, agar sesuai dengan tampilan Kalender pengguna. Identitas tamu yang dimuat ulang juga dikecualikan dari resolusi keyring akun sehingga popup keyring tamu yang tersisa tidak muncul lagi.

## Resolusi sadar kata sandi dan penghapusan berbagi yang aman

URL berbagi kini memeriksa gateway sebelum menyentuh keyring akun, sehingga akses keyring hanya terjadi setelah gateway mengembalikan tantangan kata sandi. Tautan yang hilang atau dicabut menampilkan pesan tidak lagi tersedia yang sudah ada pada halaman berbagi dan tindakan notifikasi. Pencabutan berbagi kini memerlukan popup konfirmasi eksplisit sebelum penghapusan.

## Kontrol Kalender dan penjaga kalender tulis dipulihkan

Pengalihan tampilan, navigasi periode, dan pembuatan acara dari slot waktu kini memakai batas interaksi terdelegasi yang tetap aktif setelah composer dirender ulang. Sebelum membuka penyusun acara, Calendar memeriksa semua kalender yang tersedia memakai aturan tulis berbagi yang ada dan menampilkan “Tidak ada kalender yang dapat ditulis” bila tidak ada kalender yang dapat menerima acara. Penulisan kalender tamu tetap memakai token tamu terbatas.

## Berbagi Kalender memakai siklus hidup halaman rapat yang teruji

Setelah resolusi, Share kini menyerahkan akar halaman kepada Calendar, persis seperti pada tautan rapat. Calendar memiliki page composer lengkap yang dihasilkan sehingga header standar, kontrol tema, footer, dan siklus hidup tampil bersama kartu kalender tunggal, bukan membiarkan placeholder pemuatan Share terlihat. Kontrol tampilan, navigasi, slot waktu, dan acara bertoken tamu yang didelegasikan tetap terpasang selama render ulang kalender.
