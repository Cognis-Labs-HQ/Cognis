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
