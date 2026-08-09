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

Halaman bersama kini menggunakan kembali satu sesi tamu yang telah diresolusi selama seluruh siklus hidupnya, alih-alih meresolusi identitas tamu baru ketika komponen yang dipasang diinisialisasi. Keyring tamu tetap terbatas pada sesi, mempertahankan kredensial rapat terlindungi, serta tidak lagi memanggil API keyring akun atau catatan rilis. Kontrol gaya penunjuk juga dihapus selama navigasi SPA kecuali halaman tujuan mengaktifkan pelacakan penunjuk dalam manifes composernya. Notifikasi berbagi pengguna kini membuka halaman kanonis gateway Share, dan identitas tamu tidak lagi menjalankan validasi akun atau permintaan ketersediaan Sosial. Penerima berbagi bertipe pengguna yang sudah masuk kini mempertahankan sesi akunnya dan memperoleh akses sumber daya melalui gateway Share, bukan diubah menjadi identitas tamu. Berbagi pengguna baru kini mengirim tujuan internal khusus sumber daya yang memuat pengenal catatan berbagi, bukan menyebarkan URL tamu publik. Penyedia konten kini hanya memberikan URL konten internal normalnya saat membuka Share; gateway Share memvalidasi, menyimpan, dan mengirim URL tersebut sekaligus tetap menjadi satu-satunya otoritas akses penerima. URL Share publik kini diresolusi melalui gateway Share dan meneruskan pemirsa yang diizinkan ke rute internal tersimpan; rute yang tidak tersedia tetap menampilkan halaman kesalahan Share. Token Share merujuk baris sumber daya milik gateway melalui kunci asing basis data. Berbagi aktif kini langsung beralih ke tampilan akses ditolak Share ketika permintaan sumber daya melaporkan akses yang dicabut. Sumber berbagi menyatakan dukungan hanya-baca secara eksplisit: rapat hanya menawarkan akses tulis, sedangkan papan tulis dan kalender menawarkan pilihan baca dan tulis; papan tulis hanya-baca dimuat tanpa mencoba penulisan yang dilindungi.
