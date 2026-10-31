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

## Tujuan Saat Bootstrap

Tujuan SMTP harus didaftarkan melalui `ctx` selama bootstrap gateway atau modul. Dapatkan `notify:registerSmtpPurpose`, panggil dengan nama tujuan lokal, tunggu hasilnya dan simpan pengidentifikasi yang terikat pada pemilik. Setiap pendaftaran membuat antrean serta status jeda penerima tersendiri; adapter tidak memiliki daftar tujuan bawaan.

Setiap panggilan `notify:sendEmail` wajib menyertakan `purpose` yang sudah ada. Tujuan kosong atau tidak dikenal ditolak sebelum transport SMTP; pengiriman tidak dapat membuat tujuan secara implisit. Pendaftaran ditolak setelah bootstrap selesai, gagal atau kehabisan waktu, termasuk melalui callback tersimpan dan pekerjaan asinkron terpisah. Modul yang diaktifkan setelah startup dapat mendaftar selama bootstrap miliknya. Penonaktifan atau penghapusan modul membuang antreannya, menolak pengiriman tertunda dan menutup sesi SMTP aktif.

Jeda standar adalah lima belas detik per penerima yang dinormalisasi dalam setiap tujuan. Tujuan independen diproses bersamaan sehingga koneksi lambat, percobaan ulang atau jeda tidak menghambat antrean lain. Jeda hanya diperbarui setelah pengiriman berhasil. Pemeriksaan antrean menggabungkan semua tujuan, menyertakan pengidentifikasinya dan menyimpan hingga 200 catatan selesai per antrean dalam memori.

Amplop umum menyertakan `purpose`; metode khusus pengiriman dan antrean SMTP kini menerima tujuan sebagai argumen pertama. Metode uji gateway menerima `(senderId, purpose, recipientEmail, config)`. Pembantu Gateway Notifikasi yang ada menyediakan tujuan yang didaftarkan gateway tersebut. Pemanggil komponen/modul umum mendaftarkan tujuan sendiri saat bootstrap dan menggunakan kembali pengidentifikasinya saat runtime.

## Komit

- [79980d16805ac67e696ce8d6b63f4daafba73f19](https://github.com/Cognis-Labs-HQ/Cognis/commit/79980d16805ac67e696ce8d6b63f4daafba73f19)
- [d09e01858cd856a505c24061bc524d8e87b88bf0](https://github.com/Cognis-Labs-HQ/Cognis/commit/d09e01858cd856a505c24061bc524d8e87b88bf0)

- [160953932a8754503224475915afd905e656919d](https://github.com/Cognis-Labs-HQ/Cognis/commit/160953932a8754503224475915afd905e656919d)
