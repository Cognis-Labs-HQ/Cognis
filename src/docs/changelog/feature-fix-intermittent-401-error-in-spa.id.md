# Telemetri SPA Andal

## Autentikasi mengikuti perubahan token

Telemetri performa peramban kini menggunakan klien gateway Observability dan mencoba ulang sekali ketika permintaan yang sedang berlangsung bersamaan dengan penggantian token akses, sehingga respons 401 yang tidak disengaja saat navigasi SPA dapat dicegah.

## Telemetri memakai kapabilitas UI

Telemetri kinerja browser kini menyelesaikan pengiriman melalui kapabilitas UI terdaftar milik gateway Observability, sehingga UI bersama tetap independen dari detail implementasi gateway.
