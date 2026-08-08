# Telemetri SPA Andal

## Autentikasi mengikuti perubahan token

Telemetri performa peramban kini menggunakan klien gateway Observability dan mencoba ulang sekali ketika permintaan yang sedang berlangsung bersamaan dengan penggantian token akses, sehingga respons 401 yang tidak disengaja saat navigasi SPA dapat dicegah.
