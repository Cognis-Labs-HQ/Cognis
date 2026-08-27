# Penanganan akun dan penyiapan LDAP yang lebih aman

## Penonaktifan akun oleh administrator tetap berlaku

Penyegaran profil LDAP kini mempertahankan status aktif akun yang sudah ada, sehingga autentikasi tidak dapat mengaktifkan kembali akun eksternal yang dinonaktifkan.

## Perubahan konfigurasi LDAP aman untuk dicoba ulang

Sumber autentikasi yang dihapus direkonsiliasi sebelum konfigurasi penggantinya disimpan, sehingga pembersihan yang gagal dapat dicoba ulang.

## Kesalahan penyiapan dan tindakan papan ketik tetap sesuai konteks

Penyiapan LDAP menampilkan kesalahan server pada kolom yang dibuat, mempertahankan kegagalan kredensial di halaman kredensial, dan memakai Enter untuk memverifikasi tanpa menyimpan server terlalu dini.
