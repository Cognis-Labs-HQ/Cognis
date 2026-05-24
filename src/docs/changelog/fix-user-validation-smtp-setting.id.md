# Perlindungan Validasi SMTP

## Validasi Pengguna SMTP diblokir saat adaptor SMTP tidak diaktifkan

Menu dropdown Metode Validasi Pengguna di Administrasi > Keamanan kini menonaktifkan opsi SMTP dan menandainya sebagai tidak tersedia apabila tidak ada adaptor SMTP aktif yang terdaftar di gateway notifikasi. Jika administrator mencoba menyimpan pengaturan melalui API saat SMTP tidak tersedia, server menolak permintaan tersebut dengan pesan kesalahan eksplisit, sehingga mencegah konfigurasi yang tidak valid tersimpan.
