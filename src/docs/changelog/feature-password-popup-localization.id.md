# Label Kata Sandi Bersama

**Cabang Fitur:** feature-password-popup-localization

## Bagikan Label Kata Sandi

Memindahkan persyaratan kata sandi dan umpan balik kecocokan ke katalog XML host bersama, lalu memperbarui Keamanan dan Pendaftaran. Keamanan dapat membuka formulir tanpa memuat katalog Registration opsional. Keempat terjemahan, validasi yang ada, dan resolusi ketat kunci Inggris yang sama tetap dipertahankan.

## Pertahankan Perilaku Formulir

Regresi menjalankan konstruksi Pengaturan Auth terdaftar, bagian Keamanan yang benar-benar dipasang, popup, pembangun formulir, dan resolver XML, serta halaman Pendaftaran yang dipasang. Cakupan meliputi buka/batal/pasang ulang, keputusan membuang, pelestarian bahasa pilihan, validasi, keberhasilan/kegagalan sintetis, dan kesalahan Inggris yang hilang. Kebijakan serba nol tetap memakai batas panjang minimum nyata; kasus tanpa kriteria yang disuntikkan secara terpisah hanya menguji jalur defensif, bukan kebijakan server yang didukung.

## Selaraskan Rilis Katalog

Auth 2.2.13 dan Registration 1.2.9 memerlukan katalog host bersama yang sesuai. Tidak ada versi paket UI tersendiri atau batas dependensi Auth/Registration dalam lockfile. Integrasi harus memakai kunci bersama baru. Tidak ada dependensi baru atau perubahan rute server, kebijakan kata sandi, atau kontrak autentikasi. Uji DOM terprogram tidak membuktikan tampilan browser atau penyelesaian insiden pada penerapan.

## Komit

- https://github.com/Cognis-Labs-HQ/Cognis/commit/cc70eac432da743ba23acd4dd091dba3e068b7b9
