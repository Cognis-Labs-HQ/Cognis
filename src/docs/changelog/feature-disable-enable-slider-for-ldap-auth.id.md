# Aktivasi LDAP Lebih Aman

**Cabang Fitur:** feature-disable-enable-slider-for-ldap-auth

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

## Penonaktifan akun oleh administrator tetap berlaku

Penyegaran profil LDAP kini mempertahankan status aktif akun yang sudah ada, sehingga autentikasi tidak dapat mengaktifkan kembali akun eksternal yang dinonaktifkan.

## Perubahan konfigurasi LDAP aman untuk dicoba ulang

Sumber autentikasi yang dihapus direkonsiliasi sebelum konfigurasi penggantinya disimpan, sehingga pembersihan yang gagal dapat dicoba ulang.

## Kesalahan penyiapan dan tindakan papan ketik tetap sesuai konteks

Penyiapan LDAP menampilkan kesalahan server pada kolom yang dibuat, mempertahankan kegagalan kredensial di halaman kredensial, dan memakai Enter untuk memverifikasi tanpa menyimpan server terlalu dini.

## Komit

- [96257fa](https://github.com/Cognis-Labs-HQ/Cognis/commit/96257fa81b49645e38ae015a12d7433008d903e0)
