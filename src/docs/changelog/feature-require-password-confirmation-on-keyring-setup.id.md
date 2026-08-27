# Penyiapan keyring yang lebih aman

## Konfirmasi kata sandi keyring baru

Penyiapan pada login pertama dan pembuatan ulang keyring kini meminta pengguna mengulangi kata sandi keyring khusus serta mencegah pembuatan jika kedua isian berbeda.

## Formulir kata sandi yang konsisten

Semua popup kata sandi keyring kini menggunakan penyusun formulir bersama, menandai kolom wajib dengan jelas, serta menerapkan validasi dan tata letak yang konsisten. Kriteria konfirmasi menyatakan bahwa kata sandi cocok saat tanda berhasil muncul. Tindakan “Gunakan kata sandi pengguna” menerapkan kredensial yang sudah diverifikasi saat login sehingga keyring dapat terbuka otomatis pada login dengan kata sandi berikutnya tanpa permintaan tambahan. Penghancuran keyring berlaku sebelum pembuatan ulang, dan penyiapan tetap diwajibkan jika pembuatan ulang dibatalkan. Gaya formulir kata sandi kini dimuat sebelum dialog keyring dibuka sehingga bidang lebar penuh yang seimbang dan animasi kriteria validasi kembali berfungsi. Pembersihan vault akun yang dihapus dijalankan setelah pembersihan dependensi lain dan diverifikasi melalui siklus penghapusan LDAP berulang.

## Atur ulang keyring pengguna yang dihapus

Setelah pengguna dihapus, keadaan keyring kosong dari server menjadi acuan. Jika nama pengguna dipakai kembali, penyiapan pertama akan muncul alih-alih salinan terenkripsi lama dari browser.
