# Perbaikan Akun dan Sesi

**Cabang Fitur:** fix-account-and-navigation-errors

## Administrasi Pengguna Andal

Halaman Pengguna mengenali akun aktif melalui ID akun tersimpan, termasuk sesi SSO opak. Kontrol akun sendiri mengikuti perlindungan server. Kegagalan detail akun memakai terjemahan milik Pengguna. Kegagalan pemuatan ulang tidak mengubah mutasi yang sudah dikonfirmasi menjadi gagal disimpan; daftar sebelumnya tetap tampil dengan peringatan penyegaran.

## Penyuntingan Profil dan Peran

Formulir profil memakai batas komponen untuk nama tampilan, biografi, lokasi, dan situs web. Sinkronisasi peran mencari nama publik profil dari ID akun yang tetap sebelum memperbarui peran dan visibilitas.

## Navigasi Sesi Responsif

Keluar membersihkan data sesi pribadi tanpa menunggu pemeliharaan rute publik oleh pekerja layanan. Permintaan kebijakan identik memakai satu pertukaran tanpa menggabungkan keputusan akses yang berubah. Pengalih bahasa menunggu penyedia katalog dan menyembunyikan kontrol khusus akun setelah keluar. Salinan router dalam bundel dan yang dimuat langsung berbagi status dokumen, pendengar, dan pembatalan tampilan, termasuk navigasi Pengaturan ke Dasbor.

## Percobaan Pendaftaran SSO Terbatas

Identitas SSO yang memerlukan undangan ditahan sebelum akun, profil, atau surel dibuat. Percobaan yang dibatalkan atau kedaluwarsa tidak dapat dilanjutkan; pendaftaran dan autentikasi dua faktor kedaluwarsa tepat pada batas waktu. Adaptor pendaftaran publik yang aktif tetap mengizinkan pembuatan akun SSO secara terpisah dari pendaftaran akun lokal publik. Akun lama tidak dihapus berdasarkan penyedia atau usia.

## Jeda Surel Berdasarkan Tujuan

Interval verifikasi SMTP bersama menjadi lima belas detik. Jeda dinormalisasi menurut penerima dan dipisahkan menurut tujuan pesan sehingga verifikasi, kode masuk, tautan masuk, undangan, dan pengujian tidak saling menunda. Antrean memakai interval terkonfigurasi dan waktu pengiriman berhasil; pengiriman langsung yang gagal tidak menghabiskan jeda.

## Komit

- [79980d16805ac67e696ce8d6b63f4daafba73f19](https://github.com/Cognis-Labs-HQ/Cognis/commit/79980d16805ac67e696ce8d6b63f4daafba73f19)
