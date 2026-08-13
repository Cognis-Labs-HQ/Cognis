# Menyempurnakan pengelolaan berbagi

## Cabut berbagi aktif dan batasi antarmuka tamu

Penghapusan berbagi kini menerbitkan peristiwa pencabutan ke tab aktif dan penerima yang masuk saat menerima pemberitahuan penghapusan, sehingga pemirsa terdampak segera kembali ke layar berbagi yang ditolak. Konfirmasi hapus ganda dicegah, sesi tamu tidak lagi menerima ringkasan rilis, dan sesi akun yang disimpan dipulihkan sebelum menentukan kepemilikan berbagi lain.

## Pastikan kepemilikan berbagi dan kontrol ikhtisar konsisten

Pemilik berbagi kini melewati tantangan kata sandi berbagi dan langsung menuju URL konten dengan sesi akun mereka, sementara penerima tetap menyelesaikan autentikasi berbagi yang dikonfigurasi. Halaman Berbagi milik gateway kini merender ulang baris yang difilter dan dihapus secara optimistis, memakai kolom awal ringkas sesuai isi, serta memberikan ukuran dan bantalan tombol aksi yang konsisten.

## Ikat autentikasi berbagi ke rute SPA yang diminta

Router kini memberikan jalur tujuan yang tepat kepada autentikasi sesi, dan gateway Share mengambil token berbagi pengguna dari masukan rute yang tetap tersebut. Perubahan URL yang bersamaan tidak lagi dapat membuat berbagi pengguna yang valid tampak tidak memiliki token atau menahan penerima di tampilan pemuatan publik.

## Pertahankan autentikasi akun pada permintaan penyelesaian berbagi

Penyelesaian berbagi kini menggunakan klien API terautentikasi yang selalu menyertakan token akun pengguna sambil mempertahankan header kata sandi berbagi. Tantangan kata sandi yang diharapkan dipisahkan dari penanganan penolakan akses global sehingga tidak lagi memicu pengalihan sesi tamu atau alur buka kunci ganda.

## Daftarkan autentikasi berbagi tujuan sebelum pemeriksaan SPA

Navigasi SPA kini memuat kontribusi alur entri tujuan sebelum mengautentikasi rute. Penerima berbagi pengguna karena itu diselesaikan oleh gateway Share dalam satu-satunya proses autentikasi router dan mempertahankan sesi akun lengkap, alih-alih masuk ke halaman tamu.

## Menggunakan kembali berbagi akun yang diselesaikan router

Halaman Berbagi kini memakai konteks berbagi terautentikasi yang sudah diselesaikan navigasi SPA, alih-alih menjalankan autentikasi untuk kedua kalinya. Berbagi pengguna mempertahankan klasifikasi akun langsung dan membuka halaman tujuan lengkap tanpa ditafsirkan ulang sebagai akses tamu.

## Mempertahankan penerima langsung dalam tampilan akun

Berbagi pengguna langsung yang diverifikasi server kini selalu membentuk sesi akun, meskipun tahap validasi lokal tidak mengembalikan metadata akun. Berbagi tersebut tidak lagi dapat jatuh ke tampilan tamu. Berbagi yang dihapus dan ditolak juga langsung dihilangkan dari tabel terlihat sebelum permintaan selesai.

## Menyelesaikan berbagi pengguna dalam satu alur

Klik berbagi pengguna kini menuju halaman Berbagi tanpa menyelesaikan token terlebih dahulu melalui jalur klien kedua. Alur sesi menangani validasi akun, permintaan kata sandi, dan pengiriman satu kali. Baris yang dihapus langsung menghilang dan hanya dipulihkan bila server menolak penghapusan.

## Memperbaiki pembaruan basis data berbagi

Stempel waktu akses berbagi, perubahan berbagi, dan penandaan notifikasi kedaluwarsa kini menggunakan kontrak pembaruan gateway basis data yang didukung. Ini menghapus galat objek null yang mengganggu penyelesaian berbagi yang valid.

## Menjaga audit akses agar tidak menghalangi konten

Penyelesaian berbagi tidak lagi gagal ketika pencatatan waktu akses terakhir opsional menemui kolom basis data lama atau sementara tidak tersedia. Berbagi yang belum pernah dibuka kini menampilkan Belum diakses, bukan Tidak pernah kedaluwarsa.

## Memperjelas berbagi berhasil dan menampilkan tanggal akses

Kegagalan halaman tujuan setelah berbagi pengguna diverifikasi tidak lagi melaporkan berbagi tersebut sebagai tidak valid atau kedaluwarsa. Berbagi kini menampilkan tanggal pembuatan dan akses terakhir, serta pilihan izin Whiteboard menggunakan Hanya Baca dan Baca + Tulis secara konsisten.

## Menyelesaikan navigasi berbagi terlindungi dan kontrol tamu kalender

Tindakan notifikasi kini hanya ditangani oleh satu penangan berbagi sehingga permintaan kata sandi ganda dan galat berbagi tidak valid yang keliru dicegah. Penerima kalender mengakui impor, penghapusan kalender yang diterima memakai teks yang sesuai, dan tamu kalender dapat menavigasi tampilan dengan gulir otomatis ke waktu saat ini. Akses tulis kini berlabel Baca + Tulis.

## Melanjutkan berbagi pengguna terlindungi tanpa penyelesaian ganda

Setelah penerima yang dituju membuka berbagi pengguna yang dilindungi kata sandi, hasil yang telah diverifikasi kini dibawa ke navigasi dalam aplikasi berikutnya. Cognis tidak lagi mengulangi permintaan penyelesaian tanpa kata sandinya, sehingga halaman akun lengkap terbuka alih-alih berakhir dengan galat 401 dan pemberitahuan berbagi tidak valid.

## Membuka berbagi akun secara langsung

Tautan berbagi pengguna pada halaman Berbagi dan dalam notifikasi kini diselesaikan satu kali melalui jalur akun terautentikasi lalu langsung menuju halaman tujuan lengkap. Tautan tersebut tidak lagi melewati halaman tamu atau mengaktifkan tampilan tamu terbatas.

## Membatasi berbagi pengguna hanya untuk akun

Berbagi yang ditujukan kepada pengguna Cognis tidak lagi dapat menerbitkan atau mengaktifkan sesi tamu. Hanya penerima terautentikasi yang disebutkan secara eksplisit atau pemilik berbagi yang dapat membukanya; berbagi tautan publik tetap menjadi satu-satunya mekanisme akses tamu.

## Membuat pengeditan dan berbagi pengguna terlindungi dapat diprediksi

Pembaruan berbagi kini hanya memuat perubahan nyata, pergantian metode berbagi keluar dari mode edit, dan tinggi halaman Berbagi menyesuaikan tabel. Notifikasi berbagi pengguna berpassword meminta satu kali dan dapat menyimpan password terverifikasi ke gantungan kunci penerima yang dituju, sedangkan berbagi tautan publik tetap terpisah dari gantungan kunci akun.

## Menyederhanakan perilaku berbagi akun dan tamu

Notifikasi berbagi pengguna mempertahankan sesi akun yang ditentukan, sedangkan tautan publik berpassword meminta password tanpa membuka atau menyimpannya di gantungan kunci akun sebelum masuk ke mode tamu. Kolom pembaruan kosong mempertahankan nilai lama, dan dialog berbagi milik modul kini selalu memakai teks password dan penghapusan yang telah diperbaiki.

## Mengamankan berbagi pengguna dan memperjelas kontrol

Berbagi pengguna tetap mewajibkan akun yang ditentukan alih-alih membuat akses tamu yang dapat dipindahtangankan. Tindakan berbagi kini memakai tampilan netral, pilihan izin membedakan Hanya Baca dan Baca & Tulis dengan jelas, dialog kata sandi memberi petunjuk singkat bagi penerima, dan berbagi tamu yang dihapus berakhir tanpa pengalihan atau pemberitahuan berulang.

## Memulihkan pembaruan berbagi dan perpindahan halaman yang mulus

Editor berbagi terfokus kini mengirim perubahan masa berlaku secara konsisten dan menampilkan tindakan pembaruan dengan tampilan konfirmasi standar. Navigasi dalam aplikasi mempertahankan gaya halaman saat ini sampai tujuan selesai dipasang sehingga konten lama tidak sempat berkedip tanpa gaya.

## Memfilter dan langsung menghapus berbagi

Pil ringkasan Total, Terkirim, dan Diterima kini memfilter tabel Berbagi. Berbagi yang berhasil ditolak atau dihapus langsung menghilang, dan setiap tindakan baris destruktif hanya menggunakan tampilan batal standar.

## Mempertahankan akses akun untuk berbagi milik sendiri dan yang diterima

Membuka berbagi Papan Tulis sebagai pembuatnya atau berbagi pengguna Rapat sebagai penerimanya kini mempertahankan sesi akun terautentikasi saat navigasi dalam aplikasi maupun setelah penyegaran. Tujuan memasang halaman akun lengkap, mempertahankan seluruh navigasi, dan tidak lagi masuk ke tampilan tamu terbatas.

## Mengisolasi kontrol dan gaya halaman tujuan

Pengeditan tata letak tetap dinonaktifkan pada halaman Papan Tulis dan Berbagi. Setiap navigasi dalam aplikasi kini membangun ulang dok tindakan halaman, membuang tindakan yang tidak disediakan kembali oleh tujuan, memuat paket stylesheet lengkap, dan menghapus gaya rute yang tidak lagi berlaku.

## Memusatkan pengelolaan pada satu berbagi

Halaman Berbagi kini membuka editor ringkas yang hanya memuat formulir berbagi yang dipilih. Jenis berbagi tetap terkunci, pembaruan hanya memengaruhi catatan basis data tersebut, dan dialog tidak lagi terbuka dua kali saat navigasi dalam aplikasi.

## Menyelaraskan kontrol berbagi

Halaman Berbagi tidak lagi menambahkan ruang vertikal di luar kartunya. Tombol berbagi juga selalu menggunakan tampilan batal untuk tindakan yang berpotensi mengurangi akses.

## Memulihkan rute konten yang dibagikan

Halaman gateway dan modul yang terdaftar kini memuat titik masuk dasbor serta paket stylesheet lengkapnya sendiri, baik setelah penyegaran peramban maupun saat navigasi dalam aplikasi. Karena itu, halaman Berbagi, Rapat, dan Papan Tulis tetap menampilkan bilah atas, footer, tata letak, dan gaya komponennya.

## Mempertahankan berbagi Rapat selama masa berlaku yang ditentukan

Berbagi Rapat kini tetap dapat diselesaikan di seluruh instans rapat dan sesi yang telah berakhir. Akses berlanjut sampai berbagi itu sendiri kedaluwarsa, ditolak, atau dicabut, sedangkan alur autentikasi berulang menggunakan kembali sesi berbagi yang sudah diselesaikan.

## Berbagi pengguna tetap dalam sesi akun

Berbagi langsung kepada pengguna kini mengirim tujuan buram dari penyedia konten kepada penerima yang ditentukan dan tidak pernah mengekspos URL berbagi publik atau membuat sesi tamu. Berbagi tautan mempertahankan siklus tautan publik dan akses tamunya secara mandiri.

## Terapkan akses berbagi aktif

Kata sandi berbagi yang salah kini menampilkan kesalahan dan dapat langsung dicoba kembali. Berbagi pengguna yang dilindungi dibuka sebelum konten ditampilkan, entri halaman Berbagi memakai gerbang akses yang sama dengan notifikasi, dan pencabutan berbagi tautan atau pengguna segera mengeluarkan penerima dari konten aktif.

## Stabilkan tindakan entri berbagi

Notifikasi berbagi pengguna tanpa perlindungan membuka kontennya secara langsung, entri terlindungi mengonsumsi tindakan satu kali di halaman Berbagi sebelum meminta kata sandi, dan pembukaan yang berhasil memakai rute aplikasi internal. Pengiriman berbagi pengguna duplikat kini melaporkan konflik atau memperbarui berbagi yang ada saat pengaturannya berubah.

## Jaga tab jangka panjang tetap responsif

Pemeriksaan pencabutan berbagi kini memakai satu pemantau yang sadar visibilitas, bukan polling berulang setiap setengah detik. Tab latar belakang menjeda pemeriksaan jaringan dan langsung memvalidasi saat difokuskan kembali, sehingga halaman berbagi yang berjalan lama tidak menghabiskan sumber daya peramban atau server.

## Gunakan kembali kata sandi berbagi tersimpan

Berbagi pengguna yang dilindungi kata sandi kini menyimpan dan mengambil kata sandinya dengan pengenal gantungan kunci stabil yang sama, `share:<share-id>`, sehingga pembukaan berikutnya tidak meminta kata sandi setelah disimpan.

## Jeda Papan Tulis tersembunyi

Polling kehadiran dan soket waktu nyata Papan Tulis kini dijeda saat tab tersembunyi dan dilanjutkan dengan koneksi baru ketika tab terlihat kembali. Pemuatan skrip kolaborasi juga memiliki batas waktu yang bersih agar permintaan eksternal yang macet tidak membuat pemuatan ulang berputar tanpa akhir.

## Minta akses gantungan kunci hanya saat diperlukan

Navigasi SPA tidak lagi membuka gantungan kunci secara spekulatif. Berbagi akun terlebih dahulu memeriksa apakah akses memerlukan kata sandi dan hanya meminta akses gantungan kunci untuk berbagi terlindungi tersebut, dengan tujuan akses Berbagi dan pengenal berbagi ditampilkan dalam permintaan.

## Minta akses keyring hanya saat diperlukan

Kontribusi pengaturan Keyring tidak lagi menjadwalkan permintaan buka kunci saat dirender, sehingga pemuatan Dasbor atau navigasi antarhalaman tidak dapat memicu permintaan umum. Dialog kata sandi berbagi terlindungi kini hanya menawarkan penyimpanan ke keyring setelah pembukaan kunci berkonteks berhasil.

## Batasi pekerjaan latar dan permintaan yang macet

Polling ketersediaan kini berhenti saat tab tersembunyi serta menggabungkan penyegaran dan heartbeat yang bertumpuk. Node dan Nginx menghentikan pekerjaan HTTP yang macet, PostgreSQL menerapkan batas waktu pernyataan, dan MariaDB membatasi antrean kueri agar dependensi bermasalah tidak menumpuk pekerjaan hingga halaman atau layanan tidak responsif.

## Hentikan trafik kehadiran saat halaman tidak aktif

Pelacak kehadiran kini menurunkan frekuensi dengan polling adaptif dan menghentikan semua permintaan berulang ketika pengguna tidak aktif, jendela kehilangan fokus, atau tab tersembunyi. Composer papan tulis mengikat pembersihan ke sinyal navigasinya sendiri agar navigasi SPA segera menghapus hook kehadiran, penunjuk, kanvas, dan waktu nyata tanpa memengaruhi mount berikutnya.

## Pertahankan akses pemilik tanpa kata sandi dan batasi permintaan browser tertunda

Pemilik terautentikasi dari berbagi pengguna yang dikirim ke akun kini dapat membuka berbagi miliknya tanpa memasukkan ulang kata sandi penerima; token akun pemilik tetap menjadi otoritas tanpa menyalin kata sandi ke keyring. Permintaan API browser dan lokalisasi kini memiliki tenggat, permintaan lokalisasi dan kehadiran bersamaan digabungkan, dan pembersihan navigasi membatalkan pekerjaan kehadiran yang masih berjalan.

## Kurangi trafik kehadiran aktif Whiteboard

Penyegaran kehadiran aktif kini berjalan paling cepat setiap 2,5 detik dan penulisan heartbeat paling cepat setiap 10 detik; keduanya melambat hingga 30 detik saat tidak ada perubahan. Pembaruan penunjuk dibatasi satu per detik, dan stempel waktu terakhir terlihat dari server tidak lagi dianggap sebagai perubahan UI bermakna yang mempertahankan polling adaptif pada kecepatan maksimum.

## Pengamanan berbagi akun lama dan terlindungi

Berbagi yang sudah ada dimigrasikan ke registri sumber daya saat peningkatan. Berbagi akun yang dilindungi kata sandi kini memerlukan pembukaan kunci persisten di server sebelum akses penyedia, penghapusan kedaluwarsa dipertahankan, dan pemeriksaan pencabutan berhenti setelah navigasi.

## Memulihkan kalender bersama dan tautan rapat aktif

Berbagi kalender pengguna langsung dikirim ke kalender penerima dan dibuka melalui tujuan milik penyedia. Rapat aktif yang dibagikan melalui tautan tidak lagi mewarisi status ditutup yang lama, dan ringkasan rilis tetap disembunyikan selama sesi tamu.

## Menstabilkan kontrol kalender bersama dan ringkasan tamu

Kontrol tampilan dan periode kalender bersama kini memakai satu listener sepanjang siklus halaman yang tetap aktif setelah setiap render ulang composer. Login dengan peran tamu dikenali bersama tamu berbagi terbatas sehingga ringkasan rilis dan permintaan dasbor khusus akun tidak dijalankan.

## Menjadikan deteksi tamu dan input kalender bersama otoritatif

Kontrol kalender bersama kini mendengarkan pada batas capture dokumen dan hanya menerima klik dari kalender yang dipasang, sehingga handler composer atau shell tidak mengambil navigasi lebih dahulu. Deteksi tamu kini mengenali status sesi terbatas, akun berbagi sintetis, serta penyedia tamu/berbagi sebelum ringkasan rilis atau permintaan kehadiran dimulai.

## Mengisolasi shell berbagi tamu dari startup akun

Composer berbagi publik dan kalender bersama kini secara eksplisit menonaktifkan peningkatan shell khusus akun, sehingga permintaan changelog, profil, kehadiran, dan verifikasi kata sandi tidak dimulai sebelum autentikasi tamu selesai. Navigasi pencabutan memakai kapabilitas router alih-alih impor runtime yang rapuh, dengan fallback ke URL berbagi langsung hanya bila router tidak terpasang.
