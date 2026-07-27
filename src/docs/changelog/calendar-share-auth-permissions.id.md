# Keamanan Berbagi Kalender

## Autentikasi tetap diwajibkan

Alamat ICS dan CalDAV yang dilindungi kata sandi tidak lagi memuat kredensial turunan. Klien kalender harus memakai kata sandi berbagi sebelum menerima data kalender.

## Izin berbasis standar

Penemuan CalDAV kini menerbitkan hak pengguna aktif dan kumpulan komponen VEVENT sesuai RFC. Pemeriksaan WebDAV untuk ICS menerbitkan hak baca-saja karena umpan langganan tidak mendukung penulisan.

## Nama kalender pada alamat

Varian CalDAV memuat nama kalender yang dikodekan agar klien dapat memperoleh nama yang ramah dari alamat koleksi tanpa mengungkap bahan autentikasi.
