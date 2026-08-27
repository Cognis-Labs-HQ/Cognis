# Aktivasi LDAP Lebih Aman

## Konfigurasikan server sebelum aktivasi

Penggeser aktivasi adaptor LDAP kini tetap dinonaktifkan hingga setidaknya satu server LDAP dikonfigurasi sehingga permintaan aktivasi yang tidak valid dapat dicegah.

Setelah server terverifikasi ditambahkan, aktivasi adaptor akan menyimpan konfigurasi server yang tertunda secara otomatis. Pembatalan server baru yang belum disimpan memerlukan konfirmasi.

Menyimpan dari tahap verifikasi pengguna, termasuk dengan menekan Enter, kini menjalankan uji autentikasi secara otomatis bila diperlukan. Jika uji autentikasi gagal, administrator dikembalikan ke kolom bind LDAP untuk melakukan perbaikan.

Penghapusan server LDAP terakhir kini memerlukan konfirmasi dan menonaktifkan adaptor. Kegagalan uji LDAP dapat menyoroti setiap kolom konfigurasi yang mungkin menyebabkan kegagalan, termasuk URL server, DN direktori, kredensial bind, dan filter pencarian.

Semua teks penyiapan LDAP kini berasal dari sumber daya bahasa lokal milik adaptor. Toast keberhasilan mengonfirmasi autentikasi pengguna serta pembuatan atau pembaruan server LDAP.

Gateway Autentikasi kini mengumumkan URL sumber daya bahasa setiap adaptor. Paket bahasa LDAP disajikan dari direktori UI statis yang terdaftar agar Administrasi memuatnya sebelum membuka penyiapan.

Pengujian autentikasi pengguna LDAP dengan kolom kredensial wajib yang kosong kini menampilkan toast galat yang dilokalkan. Setiap kunci label yang diberikan kepada penyusun formulir LDAP kini merupakan kunci pelokalan milik adaptor.

Menonaktifkan LDAP atau menghapus sumber kini mencabut semua sesi pengguna yang bergantung padanya. Akun sumber terpisah dihapus bersama data dependennya, sedangkan akun terpadu dipertahankan dan dapat mengaitkan identitas terbaru dari sumber LDAP lain saat login berikutnya.

Toast keberhasilan yang dilokalkan kini mengonfirmasi ketika Uji dan Temukan berhasil terhubung dan mengembalikan data direktori LDAP.
