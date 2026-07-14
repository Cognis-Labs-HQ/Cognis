# Persistensi Whiteboard

## Konten tetap ada setelah refresh

Snapshot elemen whiteboard kini disimpan melalui API Cognis dan dikembalikan bersama setiap sesi sehingga pengguna valid dan tamu berbagi memuat konten papan yang sama untuk URL yang sama.

## Berbagi dan overflow

Hook berbagi whiteboard didaftarkan pada konteks flow sistem agar pembuatan link dapat diotorisasi dengan benar, dan ukuran overflow canvas menghitung ulang batas setelah reklamasi koordinat.
