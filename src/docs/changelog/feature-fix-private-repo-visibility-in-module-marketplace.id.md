# Penemuan modul privat yang andal

**Feature Branch:** feature-fix-private-repo-visibility-in-module-marketplace

## Pemindaian repositori privat tetap aktif setelah mulai ulang

Sumber bursa Cognis Labs HQ kini menyimpan pengaturan pemindaian repositori privat di dalam rekaman sumber bawaan, sehingga modul privat yang dikonfigurasi tetap dapat ditemukan setelah server dimulai ulang.

## Pemindaian latar belakang tidak lagi membuka keyring

Polling bursa otomatis kini menjalankan penemuan sumber terautentikasi dan hanya membaca PAT saat keyring sudah terbuka. Resolver keyring tetap memvalidasi kredensial tersimpan dan menghapus nilai yang tidak valid tanpa meminta kata sandi keyring akun secara tak terduga; penyegaran eksplisit tetap dapat meminta akses.

## Setiap repositori privat yang dapat diakses dipertimbangkan

Penemuan privat tidak lagi membatasi daftar repositori terautentikasi GitHub berdasarkan afiliasi karena pembatasan tersebut dapat menghilangkan repositori yang diberi akses PAT terperinci secara eksplisit. Log pemindaian kini membedakan hasil katalog dari modul terpasang dan mengidentifikasi repositori yang ditolak karena manifes tidak valid atau kegagalan pengayaan.

## Pengaturan sumber memakai penyimpanan kontainer persisten

Kontainer produksi kini menulis rekaman sumber bursa ke volume konfigurasi terpasang, bukan ke path di bawah build server yang dapat diganti. Rekaman tersebut mempertahankan sakelar pemindaian privat dan pengenal untuk mengambil PAT dari keyring pengguna yang terenkripsi dan tersinkron ke server setelah mulai ulang.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/2d31b43565ee1b05d00301b9ed1faaf99a8a6f89
