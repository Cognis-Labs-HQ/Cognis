# Mode Terang Halaman Kesalahan

**Feature Branch:** copilot/add-light-mode-support

## Halaman kesalahan kini beradaptasi dengan baik di mode terang

Halaman kesalahan kini ditampilkan dengan benar di mode gelap maupun mode
terang. Judul gradien animasi sudah menggunakan palet warna lebih terang di
mode terang; perubahan ini memastikan elemen shell di sekitarnya juga
menyesuaikan diri.

Kontainer shell (panel workspace dan footer mengambang) sebelumnya menggunakan
warna biru tua gelap yang dikodekan keras untuk efek kaca. Di mode terang,
keduanya kini beralih ke latar belakang putih semi-transparan, menghilangkan
lapisan abu-abu kusam yang muncul di gradien halaman terang.

Status hover pada navigasi dan dropdown mendapatkan sorotan berwarna slate yang
terlihat di mode terang. Sebelumnya, latar belakang hover adalah putih pudar
yang hampir tidak terlihat, membuat elemen interaktif tampak datar.

Warna tema browser chrome (bilah alamat di perangkat mobile) kini diperbarui
secara dinamis saat pengguna mengganti tema, beralih antara biru tua gelap dan
warna halaman biru-putih terang.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/ca2c1bc892e1236a186d35264745f40c369a8ed0
