# Perlindungan Validasi SMTP

**Cabang Fitur:** copilot/fix-user-validation-smtp-setting

## Validasi Pengguna SMTP diblokir saat adaptor SMTP tidak diaktifkan

Menu dropdown Metode Validasi Pengguna di Administrasi > Keamanan kini menonaktifkan opsi SMTP dan menandainya sebagai tidak tersedia apabila tidak ada adaptor SMTP aktif yang terdaftar di gateway notifikasi. Jika administrator mencoba menyimpan pengaturan melalui API saat SMTP tidak tersedia, server menolak permintaan tersebut dengan pesan kesalahan eksplisit, sehingga mencegah konfigurasi yang tidak valid tersimpan.

## Komit

- [2e0c0df](https://github.com/Cognis-Labs-HQ/Cognis/commit/2e0c0df105ae0df41e5ce90bef8169bd1c6706d7)
