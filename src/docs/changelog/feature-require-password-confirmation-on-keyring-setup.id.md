# Penyiapan keyring yang lebih aman

**Feature Branch:** feature-require-password-confirmation-on-keyring-setup

## Konfirmasi kata sandi keyring baru

Penyiapan pada login pertama dan pembuatan ulang keyring kini meminta pengguna mengulangi kata sandi keyring khusus serta mencegah pembuatan jika kedua isian berbeda.

## Formulir kata sandi yang konsisten

Semua popup kata sandi keyring kini menggunakan penyusun formulir bersama, menandai kolom wajib dengan jelas, serta menerapkan validasi dan tata letak yang konsisten. Kriteria konfirmasi menyatakan bahwa kata sandi cocok saat tanda berhasil muncul. Tindakan “Gunakan kata sandi pengguna” menerapkan kredensial yang sudah diverifikasi saat login sehingga keyring dapat terbuka otomatis pada login dengan kata sandi berikutnya tanpa permintaan tambahan. Penghancuran keyring berlaku sebelum pembuatan ulang, dan penyiapan tetap diwajibkan jika pembuatan ulang dibatalkan. Gaya formulir kata sandi kini dimuat sebelum dialog keyring dibuka sehingga bidang lebar penuh yang seimbang dan animasi kriteria validasi kembali berfungsi. Pembersihan vault akun yang dihapus dijalankan setelah pembersihan dependensi lain dan diverifikasi melalui siklus penghapusan LDAP berulang. Pembuatan keyring kini menyertakan pilihan waktu penguncian otomatis. Upaya buka kunci manual yang gagal dapat diulangi tanpa memuat ulang Pengaturan. Setelah penghancuran manual, Pengaturan menampilkan banner “Keyring tidak ditemukan” dan hanya mengizinkan pembuatan; upaya buka kunci saat login dengan kata sandi tetap senyap serta mempertahankan batas waktu sesi yang dipilih. Pengaturan kini memulihkan status terbuka sesi browser yang masih berlaku sebelum menampilkan status keyring. Konfirmasi pengosongan destruktif selalu menggunakan gaya pembatalan. Upaya buka kunci manual yang gagal tetap dapat diulangi.

## Atur ulang keyring pengguna yang dihapus

Identitas instans akun membedakan pengguna yang dihapus dan dibuat ulang dari keyring yang belum tersinkronisasi. Penggunaan ulang nama pengguna memulai penyiapan pertama, sedangkan kegagalan unggah sementara tidak dapat menghapus satu-satunya salinan lokal terenkripsi. Keadaan keyring di browser dihapus ketika penghapusan akun membatalkan sesi aktif. Penanganan akses ditolak kembali melalui pemecah sesi server agar pengguna yang dihapus melihat “Akun Dihapus”, bukan pemberitahuan sesi berakhir yang umum.

## Tindakan penyiapan yang andal

Membatalkan pembuatan keyring tidak lagi membuat tindakan di Pengaturan berhenti merespons. Pilihan waktu penguncian otomatis menggunakan satu definisi yang sama pada penyiapan dan Pengaturan, sedangkan pembuatan dengan kata sandi pengguna memakai tampilan untuk tindakan kreatif.

## Commits

- [77460b6](https://github.com/Cognis-Labs-HQ/Cognis/commit/77460b6c93444a0c0c8d467b879551c38dedcc41)
