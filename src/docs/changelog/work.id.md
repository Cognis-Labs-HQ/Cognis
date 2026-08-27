# Aktivasi LDAP Lebih Aman

## Konfigurasikan server sebelum aktivasi

Penggeser aktivasi adaptor LDAP kini tetap dinonaktifkan hingga setidaknya satu server LDAP dikonfigurasi sehingga permintaan aktivasi yang tidak valid dapat dicegah.

Setelah server terverifikasi ditambahkan, aktivasi adaptor akan menyimpan konfigurasi server yang tertunda secara otomatis. Menekan Enter pada tahap verifikasi pengguna kini menguji autentikasi, dan pembatalan server baru yang belum disimpan memerlukan konfirmasi.

Menyimpan dari tahap verifikasi pengguna kini menjalankan uji autentikasi secara otomatis bila diperlukan. Jika uji autentikasi gagal, administrator dikembalikan ke kolom bind LDAP untuk melakukan perbaikan.
