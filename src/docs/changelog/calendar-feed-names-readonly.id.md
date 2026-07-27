# Nama Umpan Kalender

## Sumber daya ICS bernama

Varian ICS kini berakhir dengan nama kalender aktif yang dikodekan dan `.ics`. Alamat lama yang hanya berisi token dialihkan setelah autentikasi ke sumber daya bernama agar klien impor memperoleh nama kalender yang benar.

## Baca-saja yang ditegakkan

Berbagi ICS dan CalDAV baca-saja menolak setiap metode WebDAV yang mengubah data dengan `403` dan respons `DAV:need-privileges`. Berbagi CalDAV baca-tulis tetap menerima perubahan acara yang didukung.
