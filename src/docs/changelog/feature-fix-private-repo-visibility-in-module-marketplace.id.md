# Penemuan modul privat yang andal

## Pemindaian repositori privat tetap aktif setelah mulai ulang

Sumber bursa Cognis Labs HQ kini menyimpan pengaturan pemindaian repositori privat di dalam rekaman sumber bawaan, sehingga modul privat yang dikonfigurasi tetap dapat ditemukan setelah server dimulai ulang.

## Pemindaian latar belakang tidak lagi membuka keyring

Polling bursa otomatis hanya membaca PAT saat keyring sudah terbuka. Kegagalan autentikasi penyedia dilaporkan tanpa meminta kata sandi keyring akun secara tak terduga; penyegaran eksplisit tetap dapat meminta akses.

## Setiap repositori privat yang dapat diakses dipertimbangkan

Penemuan privat tidak lagi membatasi daftar repositori terautentikasi GitHub berdasarkan afiliasi karena pembatasan tersebut dapat menghilangkan repositori yang diberi akses PAT terperinci secara eksplisit. Log pemindaian kini membedakan hasil katalog dari modul terpasang dan mengidentifikasi repositori yang ditolak karena manifes tidak valid atau kegagalan pengayaan.
