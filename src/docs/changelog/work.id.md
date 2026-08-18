# Pulihkan halaman modul terpasang

## Muat rute UI modul eksternal dari direktori pemasangannya

Modul terpasang kini ditemukan berdasarkan UUID stabilnya di direktori modul eksternal. Halaman dan kontribusi navigasi yang dideklarasikan dimuat secara otomatis saat aplikasi dimulai, bukan dicari di jalur modul bawaan.

## Selesaikan bootstrap sebelum permintaan

Cognis kini menunggu pemulihan status modul tersimpan dan bootstrap modul selesai sebelum menerima permintaan. Dengan demikian, skrip dan gaya modul eksternal telah terdaftar sebelum diminta oleh halamannya.

## Sediakan kapabilitas autentikasi

Gateway autentikasi kini menerbitkan fungsi autentikasi permintaan dan akses peran melalui bus kapabilitas. Modul eksternal dapat memulai rute API terlindungi tanpa mengimpor internal gateway, sehingga aset UI dan pendaftaran navigasinya tetap aktif.

## Muat hanya kapabilitas UI yang dinyatakan

Modul dapat menyatakan `requiresCapabilities` dalam manifesnya. Sebelum memasang rute modul, Cognis hanya mengimpor skrip penyedia terdaftar untuk kapabilitas `ui:*` yang dinyatakan, sehingga layanan UI yang diperlukan siap tanpa memberikan integrasi yang tidak terkait.
