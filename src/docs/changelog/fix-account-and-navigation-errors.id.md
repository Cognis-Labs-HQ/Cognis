# Perbaikan Akun dan Sesi

**Cabang Fitur:** fix-account-and-navigation-errors

## Administrasi Pengguna Andal

Halaman Pengguna mengenali akun aktif melalui ID akun tersimpan, termasuk sesi SSO opak. Kontrol akun sendiri mengikuti perlindungan server. Kegagalan detail akun memakai terjemahan milik Pengguna. Kegagalan pemuatan ulang tidak mengubah mutasi yang sudah dikonfirmasi menjadi gagal disimpan; daftar sebelumnya tetap tampil dengan peringatan penyegaran.

## Penyuntingan Profil dan Peran

Formulir profil memakai batas komponen untuk nama tampilan, biografi, lokasi, dan situs web. Sinkronisasi peran mencari nama publik profil dari ID akun yang tetap sebelum memperbarui peran dan visibilitas.

Penyimpanan profil menjalankan validasi formulir yang sudah ada sebelum menutup editor. Nama tampilan wajib diisi; nilai yang hanya berisi spasi ditolak.

## Navigasi Sesi Responsif

Keluar membersihkan data sesi pribadi tanpa menunggu pemeliharaan rute publik oleh pekerja layanan. Permintaan kebijakan identik memakai satu pertukaran tanpa menggabungkan keputusan akses yang berubah. Pengalih bahasa menunggu penyedia katalog dan menyembunyikan kontrol khusus akun setelah keluar. Salinan router dalam bundel dan yang dimuat langsung berbagi status dokumen, pendengar, dan pembatalan tampilan, termasuk navigasi Pengaturan ke Dasbor.

## Percobaan Pendaftaran SSO Terbatas

Identitas SSO yang memerlukan undangan ditahan sebelum akun, profil, atau surel dibuat. Percobaan yang dibatalkan atau kedaluwarsa tidak dapat dilanjutkan; pendaftaran dan autentikasi dua faktor kedaluwarsa tepat pada batas waktu. Adaptor pendaftaran publik yang aktif tetap mengizinkan pembuatan akun SSO secara terpisah dari pendaftaran akun lokal publik. Akun lama tidak dihapus berdasarkan penyedia atau usia.

## Jeda Surel Berdasarkan Tujuan

Interval verifikasi SMTP bersama menjadi lima belas detik. Jeda dinormalisasi menurut penerima dan dipisahkan menurut tujuan pesan sehingga verifikasi, kode masuk, tautan masuk, undangan, dan pengujian tidak saling menunda. Antrean memakai interval terkonfigurasi dan waktu pengiriman berhasil; pengiriman langsung yang gagal tidak menghabiskan jeda.

## Sumber dan Penyiapan Bersama

Kredensial sumber modul dan cache penemuan dibagikan ke semua administrator; rahasia tetap tersembunyi di server. Penyimpanan kolom kredensial kosong mempertahankan nilai yang ada. Pengaturan Keyring menunggu status otoritatif, penyiapan TFA yang belum selesai memerlukan konfirmasi pembuangan, dan pengalihan internal Pengaturan/bagikan mempertahankan navigasi SPA. Keyring: **2.1.1**, TFA: **1.1.20**.

Pengiriman implisit formulir yang terikat ditangani di tempat tanpa meminta dokumen browser. Penangan pengiriman komponen tetap menerima kejadian tersebut. Pengalihan internal menggunakan router SPA; tujuan yang dirender server tetap menghormati keputusan perubahan belum tersimpan dan memeriksa kembali ketersediaan offline saat dilanjutkan.

Pembuatan akun oleh administrator kini meneruskan nama peran lengkap melalui alur penyediaan ke penyimpanan akun. Akun administrator, moderator dan pengajar tidak lagi kembali ke peran pengguna biasa.

## Bootstrap dan Kanal

SMTP memiliki registrasi aksi, penyusunan pesan, dan antrean. Daftarkan `notify:registerSmtpPurpose` dengan pengenal lokal dan fungsi aksi yang membangun pesan dari variabel. Gateway, adapter, dan modul eksternal hanya mendaftar dalam lingkup bootstrap masing-masing; pengenal menyertakan pemilik. Auth, Registration, TFA, dan Share memiliki isi pesannya sendiri. SMTP tidak memiliki daftar tujuan atau templat aplikasi.

Setiap panggilan `notify:sendEmail` menyertakan tujuan yang sudah terdaftar dan variabel. `templateId` tidak digunakan lagi. Tujuan yang hilang atau tidak dikenal ditolak; aksi asinkron diperiksa kembali sebelum masuk antrean. Registrasi ditutup saat bootstrap selesai, gagal, atau melewati batas waktu. Hook penyelesaian gateway berjalan dengan pemilik yang sama setelah penyedia selesai melakukan bootstrap.

Kategori notifikasi memakai kemampuan `notify:registerCategory` yang sudah ada. SMTP membuat antrean saat registrasi dan mengembalikan fungsi pengiriman terikat kepada gateway. Gateway tetap netral terhadap pengirim. Pengiriman tidak membuat atau menebak tujuan; pengiriman SMTP langsung memerlukan tujuan terdaftar yang dinyatakan secara eksplisit.

Penonaktifan gateway dan pelepasan modul menghapus aksi miliknya serta membatalkan pengiriman tertunda. Aktivasi ulang memulihkan antrean baru tanpa mengirim ulang email yang dibatalkan. Kategori bersama tetap aktif selama pemilik terdaftar lainnya masih aktif. Penonaktifan pengirim SMTP juga menutup sesi dan membatalkan pengiriman tertunda; aktivasi ulang hanya memulihkan registrasi yang masih ada.

Jeda bawaan adalah lima belas detik per penerima yang dinormalisasi dalam setiap antrean. Antrean terpisah berjalan bersamaan. Hanya pengiriman berhasil yang memperbarui jeda. Riwayat menyimpan hingga 200 catatan selesai per antrean dalam memori. `sendEmail` mengembalikan tanda terima antrean yang sebenarnya; tanda terima antrean tidak menyatakan pengiriman SMTP telah berhasil.

Kontrak pengirim memakai `test(recipient, config)` umum dan hook bootstrap, kanal, serta siklus hidup opsional. Gateway memanggil `testSender(senderId, recipient, config)` tanpa metode khusus SMTP untuk pengujian, verifikasi, undangan, atau login. Fungsi bantu gateway khusus SMTP dan registrasi templat terpisah dihapus.

## Perbaikan Tinjauan

Validasi repositori GitLab menyertakan prefiks pemasangan yang dikonfigurasi sambil mempertahankan pembatasan asal dan namespace. Transisi siklus hidup gateway bersifat asinkron dan berurutan: pemanggil menunggu aktivasi atau penonaktifan, sumber daya bootstrap dipertahankan hingga pemiliknya dinonaktifkan, dan aktivasi yang gagal dibatalkan. Adapter memperoleh identitas bootstrap sendiri. SMTP TFA adalah **1.0.38**.

## Keamanan Permintaan Runtime

Pergantian bahasa dan penyegaran persetujuan tidak lagi gagal akibat Calendar mencoba mendaftarkan notifikasi saat menangani permintaan HTTP biasa. Calendar mendaftarkan kategorinya sekali saat penyelesaian bootstrap, setelah penyedia notifikasi tersedia. Share memakai kategori yang sudah terdaftar, sedangkan Auth memakai hook penyelesaian tanpa registrasi awal yang berulang. Registrasi SMTP tetap dibatasi selama bootstrap; handler runtime hanya mencari dan memakai kemampuan pengiriman yang sudah ada. Calendar adalah **1.5.5**.

## Pengiriman Notifikasi Study

Notifikasi permintaan, konten, dan penghapusan Study memakai kategori yang didaftarkan saat bootstrap Library. Pengiriman runtime hanya mencari kemampuan notifikasi terkini tanpa melakukan registrasi, sehingga pembatasan bootstrap SMTP tidak menghalangi pengiriman atau pemberitahuan perubahan visibilitas.

## Pengikatan Kredensial Instalasi

Instalasi mengambil kredensial dengan snapshot penyedia, endpoint, dan namespace yang sama dengan snapshot untuk memvalidasi URL repositori. Perubahan pengikatan sumber secara bersamaan membatalkan proses sebelum checkout, sehingga kredensial endpoint pengganti tidak dikirim ke host sebelumnya. Alias host API-ke-repositori GitHub hanya berlaku untuk sumber GitHub.

## Konfirmasi TFA Berlapis

Setelah pembatalan pendaftaran dikonfirmasi server, navigasi ditawarkan kembali ke penjaga halaman lainnya. Membuang pendaftaran tidak membuang perubahan Pengaturan yang terpisah. Mempertahankan perubahan menghentikan navigasi; membuangnya secara eksplisit melanjutkan navigasi. Halaman yang sudah dilepas tidak dapat melanjutkan navigasi pendaftaran yang tersimpan.

## Komit

- [79980d16805ac67e696ce8d6b63f4daafba73f19](https://github.com/Cognis-Labs-HQ/Cognis/commit/79980d16805ac67e696ce8d6b63f4daafba73f19)
- [d09e01858cd856a505c24061bc524d8e87b88bf0](https://github.com/Cognis-Labs-HQ/Cognis/commit/d09e01858cd856a505c24061bc524d8e87b88bf0)
- [160953932a8754503224475915afd905e656919d](https://github.com/Cognis-Labs-HQ/Cognis/commit/160953932a8754503224475915afd905e656919d)
- [b379b4ac8cda27e2593bba493d5e9f13dc555b20](https://github.com/Cognis-Labs-HQ/Cognis/commit/b379b4ac8cda27e2593bba493d5e9f13dc555b20)
- [f38348a9285ed82d5cac049cf511c246a6124ac4](https://github.com/Cognis-Labs-HQ/Cognis/commit/f38348a9285ed82d5cac049cf511c246a6124ac4)
- [1597944b8e745acf4c2116c2786df7cd0b7dc1a9](https://github.com/Cognis-Labs-HQ/Cognis/commit/1597944b8e745acf4c2116c2786df7cd0b7dc1a9)
- [f0e2f4e0fdc2f5d1acbfc13c275b9726c9dd0e5d](https://github.com/Cognis-Labs-HQ/Cognis/commit/f0e2f4e0fdc2f5d1acbfc13c275b9726c9dd0e5d)
