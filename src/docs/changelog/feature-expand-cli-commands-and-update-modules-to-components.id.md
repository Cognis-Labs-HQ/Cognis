# Cakupan CLI Modul

## Perintah API modul ditambahkan

Menambahkan perintah Cognisctl untuk endpoint backend modul yang sebelumnya memerlukan panggilan HTTP langsung, termasuk tampilan aktivitas Analytics, administrasi Jitsi Meet, dan operasi Nextcloud Whiteboard.

## Bootstrap API untuk kontribusi health diperbaiki

Bootstrap API kini memakai health service yang sama dengan server sehingga komponen dapat mendaftarkan kontribusi health tanpa menggagalkan proses startup.
