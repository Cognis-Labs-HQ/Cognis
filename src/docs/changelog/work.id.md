# Pemeriksaan CI Andal

## Berkas sumber tetap dalam batas ukuran

Persistensi pembukaan kunci sesi, gaya detail kalender, elemen halaman rapat, pencarian dan status papan tulis, serta pemeliharaan DOM penyusun halaman dipisahkan ke modul pendamping yang terfokus agar setiap berkas sumber tetap berada dalam batas 1000 baris.

## Pengujian profil Docker berjalan dengan jalur terbatas

Pengujian profil Docker kini menemukan Bash melalui jalur absolut yang didukung dan secara eksplisit melewati pemeriksaan eksekusi shell ketika citra CI minimal tidak memasang Bash, alih-alih gagal dengan kesalahan proses yang menyesatkan.

## Pengujian tema SMTP memakai penerima terisolasi

Pengujian surel tema bawaan kini memakai identitas penerima tersendiri agar pembatasan laju penerima dari pengujian SMTP di sekitarnya tidak menyebabkan kegagalan berkala pada seluruh rangkaian pengujian.

## Pengujian keyring tetap terisolasi per komponen

Impor langsung yang tidak digunakan terhadap singleton konteks UI dihapus dari penyiapan pengujian keyring sehingga pengujian adapter memeriksa permukaan keyring tanpa bergantung pada bentuk ekspor internal komponen lain.
