# Popup Berbagi Dipulihkan

## Popup berbagi yang konsisten

Papan tulis kini membuka popup siap pakai milik gateway Berbagi dengan pengenal sumber daya dan kapabilitasnya, mengikuti integrasi gateway yang sama dengan komponen lain. Gateway tetap bertanggung jawab atas metode berbagi dan permintaan token.

## Avatar kehadiran tetap di tempat

Gambar profil kehadiran halaman kini memperoleh tampilannya dari stylesheet kehadiran bersama, sehingga tetap menjadi avatar bilah alat dan tidak muncul sebagai lapisan gambar tanpa gaya di atas kanvas papan tulis.

## Mempertahankan autentikasi tamu berbagi

Membuka tautan berbagi papan tulis kini mempertahankan sesi tamu terbatasnya. Cognis tidak lagi memeriksa identitas tamu sementara sebagai akun pengguna biasa, menghapus tokennya, atau melaporkan bahwa akun tersebut telah dihapus.

## Memuat data dasbor yang menyadari sesi tamu

Halaman bersama kini menggunakan kapabilitas sesi tamu milik gateway Share saat memilih permintaan profil dan dasbor, sehingga permintaan khusus akun yang tidak relevan tidak lagi gagal ketika papan tulis dibuka.

## Berbagi terlindungi mempertahankan keyring tamu

Halaman bersama kini menggunakan kembali satu sesi tamu yang telah diresolusi selama seluruh siklus hidupnya, alih-alih meresolusi identitas tamu baru ketika komponen yang dipasang diinisialisasi. Keyring tamu tetap terbatas pada sesi, mempertahankan kredensial rapat terlindungi, serta tidak lagi memanggil API keyring akun atau catatan rilis. Kontrol gaya penunjuk juga dihapus selama navigasi SPA kecuali halaman tujuan mengaktifkan pelacakan penunjuk dalam manifes composernya. Notifikasi berbagi pengguna kini membuka halaman kanonis gateway Share, dan identitas tamu tidak lagi menjalankan validasi akun atau permintaan ketersediaan Sosial. Penerima berbagi bertipe pengguna yang sudah masuk kini mempertahankan sesi akunnya dan memperoleh akses sumber daya melalui gateway Share, bukan diubah menjadi identitas tamu. Berbagi pengguna baru kini mengirim tujuan internal khusus sumber daya yang memuat pengenal catatan berbagi, bukan menyebarkan URL tamu publik. Penyedia konten kini hanya memberikan URL konten internal normalnya saat membuka Share; gateway Share memvalidasi, menyimpan, dan mengirim URL tersebut sekaligus tetap menjadi satu-satunya otoritas akses penerima. URL Share publik kini diresolusi melalui gateway Share dan meneruskan pemirsa yang diizinkan ke rute internal tersimpan; rute yang tidak tersedia tetap menampilkan halaman kesalahan Share. Token Share merujuk baris sumber daya milik gateway melalui kunci asing basis data. Berbagi aktif kini langsung beralih ke tampilan akses ditolak Share ketika permintaan sumber daya melaporkan akses yang dicabut. Sumber berbagi menyatakan dukungan hanya-baca secara eksplisit: rapat hanya menawarkan akses tulis, sedangkan papan tulis dan kalender menawarkan pilihan baca dan tulis; papan tulis hanya-baca dimuat tanpa mencoba penulisan yang dilindungi. Tamu berbagi kini mempertahankan identitas tamu dan konteks berbagi internal yang telah diselesaikan saat router membuka papan tulis, sehingga nama profil tidak diperlukan. Tamu hanya-baca dapat mengirim dan melihat kehadiran penunjuk dengan akses baca, dan meninggalkan papan tulis segera menghentikan polling kehadiran serta mengirim status tidak aktif. Notifikasi berbagi pengguna kini kembali melalui URL Share kanonis agar Kalender dan Rapat dapat memvalidasi serta memberikan akses sebelum menuju rute konten Cognis. Penerima tidak lagi melihat kontrol berbagi; kartu yang tidak mendukung perbedaan izin tidak menyebut baca/tulis, penyuntingan memakai istilah izin yang konsisten, dan pembaruan kedaluwarsa kosong tidak lagi membuat PATCH yang tidak valid. Penerima berbagi rapat mendapat akses peserta dinamis hanya selama berbagi masih berlaku; Rapat bersama melewati permintaan awal khusus akun dan payload Kalender bersama dimuat tanpa profil khusus akun.

## Perbaiki formulir acara Kalender

Formulir acara Kalender kini memuat dependensi pengamanan HTML secara eksplisit sehingga kesalahan `escapeHtml is not defined` tidak lagi terjadi saat membuka atau membuat acara.

## Sempurnakan akses Meeting bersama

Dialog berbagi kini menggunakan tindakan Tutup yang netral dan tindakan Cabut yang destruktif. Meeting yang dibagikan kepada pengguna mempertahankan struktur halaman lengkap tanpa menampilkan kontrol untuk membagikannya kembali, sedangkan tautan yang ditolak berhenti di layar akses dan tidak dimuat ulang berulang kali.

## Kelola berbagi di satu tempat

Menu Pengguna kini memiliki halaman Berbagi untuk membuka berbagi yang dikirim dan diterima. Pembuat dapat mengelola atau menghapus berbagi terkirim, penerima dapat menolak berbagi yang diterima, dan Cognis memberi tahu pengguna terkait saat berbagi dihapus, kedaluwarsa, atau ditolak.

## Hentikan aktivitas halaman bersama saat akses berakhir

Kehadiran Whiteboard kini segera berhenti ketika berbagi dicabut dan dilepas sepenuhnya saat navigasi SPA. Tombol tindakan halaman memakai satu dok yang dikelola CTX sehingga kontrol penunjuk, tema, dan tata letak memiliki posisi yang konsisten serta dapat ditambahkan, diperbarui, atau dihapus mengikuti siklus hidup halaman. Dialog berbagi selalu menyediakan label Tutup, dan penerima berbagi Meeting yang telah masuk memuat struktur halaman akun lengkap.

## Sederhanakan ikhtisar Berbagi

Berbagi terkirim dan diterima kini tampil dalam satu tabel responsif yang rapi dengan informasi tujuan dan asal berbagi yang jelas. Judul berbagi membuka kontennya secara langsung, sedangkan tindakan Kelola berbasis ikon membuka editor Berbagi yang sudah diisi dari basis data gateway sehingga pemilik dapat memperbarui penerima, izin, nama, kedaluwarsa, dan perlindungan tanpa meninggalkan halaman Berbagi.

## Cegah navigasi dan status berbagi yang kedaluwarsa

Navigasi SPA yang tumpang tindih kini membatalkan pemuatan rute lama sebelum dapat dipasang. Berbagi yang kedaluwarsa dilaporkan tidak aktif, dan notifikasi kedaluwarsa baru ditandai selesai setelah semua pengiriman berhasil sehingga kegagalan sementara dicatat dan dicoba kembali.

## Satu konteks akun untuk sesi tamu

Fitur dasbor kini menggunakan kapabilitas sesi tamu bersama dari konteks akun, bukan menafsirkan penyimpanan autentikasi secara terpisah.

## Sejajarkan tindakan berbagi

Tabel Berbagi kini memusatkan judul Tindakan dan mempertahankan kontrol Kelola, Salin, dan Hapus dalam kolom vertikal yang konsisten di setiap baris.

## Pertahankan akses berbagi yang diperbarui

Perubahan izin berbagi pengguna kini tidak lagi membatalkan pembukaan akses penerima yang sudah ada. Tautan berbagi yang tidak tersedia kini membuka halaman galat standar dengan penjelasan yang jelas dan terlokalisasi.
