# Kembali Setelah Masuk

## Lanjutkan halaman sebelumnya

Saat sesi habis, Cognis kini menyimpan halaman saat ini di URL masuk dan mengembalikan pengguna ke halaman tersebut setelah berhasil masuk, alih-alih selalu membuka Dasbor.

## Tujuan kembali yang aman

Tujuan kembali setelah masuk dibatasi pada jalur lokal Cognis sehingga pengalihan eksternal atau pengalihan masuk berulang dapat dicegah.

## Lanjutkan melalui verifikasi dan autentikasi dua faktor

Pendaftaran akun membawa tujuan kembali ke verifikasi email dan penyiapan autentikasi dua faktor sehingga penyelesaian kedua alur tersebut dilanjutkan menuju halaman yang semula memerlukan autentikasi.

## Inisialisasi dasbor sebelum melanjutkan

Autentikasi yang berhasil kini memuat kerangka Dasbor sebelum membuka halaman yang diminta agar kontribusi navigasi dan penyiapan keyring selalu diinisialisasi dengan benar.

## Terima jalur kembali yang relatif terhadap root

Tujuan kembali setelah masuk tidak harus diawali garis miring. Cognis menormalkannya menjadi jalur aman yang relatif terhadap root dan tetap menolak tujuan eksternal.
