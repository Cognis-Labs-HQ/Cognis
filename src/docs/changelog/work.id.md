# Pemeriksaan CI Andal

## Berkas sumber tetap dalam batas ukuran

Persistensi pembukaan kunci sesi, gaya detail kalender, elemen halaman rapat, pencarian dan status papan tulis, serta pemeliharaan DOM penyusun halaman dipisahkan ke modul pendamping yang terfokus agar setiap berkas sumber tetap berada dalam batas 1000 baris.

## Pengujian profil Docker berjalan dengan jalur terbatas

Pengujian profil Docker kini menjalankan program sistem yang diperlukan melalui jalur absolut sehingga pengaturan `PATH` yang terbatas atau tidak terkait tidak menimbulkan kegagalan proses yang menyesatkan.
