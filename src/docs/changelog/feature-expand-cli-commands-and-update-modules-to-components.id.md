# Cakupan CLI Modul

## Perintah API modul ditambahkan

Menambahkan perintah Cognisctl untuk endpoint backend modul yang sebelumnya memerlukan panggilan HTTP langsung, termasuk tampilan aktivitas Analytics, administrasi Jitsi Meet, dan operasi Nextcloud Whiteboard.

## Bootstrap API untuk kontribusi health diperbaiki

Bootstrap API kini memakai health service yang sama dengan server sehingga komponen dapat mendaftarkan kontribusi health tanpa menggagalkan proses startup.

# Cakupan CLI

## Perintah operasional

CLI kini memiliki perintah untuk TFA, notifikasi, alamat email, undangan, kalender, bahasa belajar, percakapan pesan, dan berbagi agar administrator dapat menjangkau lebih banyak fungsi aplikasi dari `cognisctl`.

## Panduan interaktif

Perintah dengan payload kompleks dapat meminta nilai yang diperlukan saat tidak ada argumen yang diberikan, sehingga transaksi API terstruktur lebih mudah dikirim dengan benar.

# Cakupan CLI Komponen

## Penemuan CLI

CLI sekarang menemukan plugin perintah dari modul, gateway, dan adapter, termasuk titik masuk CLI yang dideklarasikan di manifest, serta menampilkan perintah dinamis dengan format keluaran bawaan.

## Operasi komponen

`component:list` sekarang melaporkan modul, gateway, dan adapter berdasarkan tipe komponen. Perintah impor GitHub kini menjadi `component:import`, dan kontrol konfigurasi serta pengujian adapter tersedia melalui `component:config:get`, `component:config:set`, dan `component:test`.
