# Penggunaan

Prosedur praktis untuk Masuk LDAP.

## Prasyarat

Siapkan alamat LDAP, kredensial bind, basis pencarian, dan filter pengguna di administrasi Autentikasi.

## Contoh

Simpan pengaturan LDAP lalu jalankan uji koneksi. Atasi kesalahan bind atau pencarian, kemudian uji masuk pengguna direktori sebelum mengandalkan grup administrator.

## Hasil yang Diharapkan

Pengujian melaporkan koneksi dan pencarian. Autentikasi berhasil menautkan identitas direktori ke akun Cognis.

## Pemecahan Masalah

Periksa kepercayaan TLS, izin bind, cakupan pencarian, dan filter pengguna. Koneksi berhasil belum membuktikan kata sandi pengguna atau pemetaan grup benar.
