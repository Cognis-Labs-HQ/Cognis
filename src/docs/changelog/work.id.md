# Perbaikan Tampilan Share

## Tampilan share whiteboard diperbaiki

Tautan share whiteboard kini memilih renderer halaman yang sesuai, bukan hasil hook renderer pertama, sehingga aplikasi whiteboard bersama dimuat alih-alih menampilkan pesan konten bersama tidak tersedia.

## Overflow canvas dikurangi

Canvas whiteboard kini mempertahankan ukuran default saat konten masih muat dan hanya menambahkan ruang overflow ketika elemen benar-benar melewati batas canvas yang terlihat.
