# Telemetri SPA Andal

**Feature Branch:** feature-fix-intermittent-401-error-in-spa

## Autentikasi mengikuti perubahan token

Telemetri performa peramban kini menggunakan klien gateway Observability dan mencoba ulang sekali ketika permintaan yang sedang berlangsung bersamaan dengan penggantian token akses, sehingga respons 401 yang tidak disengaja saat navigasi SPA dapat dicegah.

## Telemetri memakai kapabilitas UI

Telemetri kinerja browser kini menyelesaikan pengiriman melalui kapabilitas UI terdaftar milik gateway Observability, sehingga UI bersama tetap independen dari detail implementasi gateway.

## Commits

- [55815c3](https://github.com/Cognis-Labs-HQ/Cognis/commit/55815c3e03a8498211a2619ef9e4ee61895461a5)
