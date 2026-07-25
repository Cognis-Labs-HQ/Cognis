# Startup administrasi modul yang andal

## Tunggu rute modul sebelum menerima permintaan

API kini menyelesaikan pemulihan status modul dan pendaftaran rute ekstensi sebelum menangani permintaan, sehingga mencegah respons 404 sementara dari endpoint konfigurasi dan kegagalan aktivasi langsung selama startup.
