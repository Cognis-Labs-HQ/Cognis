# Pengamanan siklus token

## Contoh Penggunaan

Gunakan titik akhir keamanan sistem atau penegakan TFA yang terautentikasi untuk mengubah kewajiban penyiapan. Penerapan kebijakan yang gagal mengembalikan kesalahan, bukan penyimpanan yang berhasil.

## Spesifikasi Teknis

Semua jalur penegakan TFA memakai alur kebijakan milik komponen. Menonaktifkan penegakan mencabut seluruh kredensial dengan penyiapan tertunda, termasuk kredensial lama administrator pelaksana, tanpa mengubah sesi normal. Pembersihan mendahului penulisan kebijakan dan aman diulang. Penyedia yang tidak tersedia atau kegagalan penulisan menghasilkan kegagalan; berkas token dan basis data bukan satu transaksi. Kegagalan penulisan kebijakan dapat mempertahankan kebijakan yang lebih ketat dengan kredensial tertunda yang sudah dicabut. Penggantian berkas atomik lokal tidak menjamin ketahanan terhadap kerusakan perangkat keras atau menyinkronkan beberapa proses server.

Penulisan pengaturan yang tidak terkait tidak menerapkan kebijakan TFA. Jika kapabilitas pembacaan TFA tersedia, pembacaan sistem dan penulisan tanpa kolom TFA memakai kebijakan terkini dari pemiliknya; kegagalan pembacaan menghasilkan kesalahan, bukan laporan bahwa penegakan dinonaktifkan. Tanpa kapabilitas opsional tersebut, preferensi tersimpan hanya merupakan salinan yang mungkin usang. Perubahan kebijakan eksplisit tetap memerlukan kapabilitas pemilik.

## Otorisasi Target Akun

Pengelolaan lintas akun serta semua pembacaan TFA dengan pilihan target, operasi kode pemulihan, preferensi metode, pengaktifan/penonaktifan, dan pengaturan ulang administrator memerlukan kebijakan Auth `auth:authorizeAccountTarget` v1. Administrator tidak dapat mengelola administrator lain, pemilik, atau administrator pendiri. Operasi yang diizinkan bagi pemilik tetap tersedia. Kebijakan yang hilang atau metadata akun yang tidak dapat dibaca menyebabkan penolakan sebelum akses penyimpanan lanjutan. Pengelolaan pengguna tetap melarang pengelolaan diri; TFA menerima target pribadi yang tidak ditentukan atau ditentukan secara persis. Penyiapan dan detail metode tetap khusus akun sendiri. Parameter target kosong, ganda, atau tidak valid ditolak. Gunakan Pengaturan untuk keamanan akun sendiri dan administrasi Pengguna untuk akun lain yang memenuhi syarat.
