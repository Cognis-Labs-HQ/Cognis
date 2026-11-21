# Uji Kalender yang Andal

**Cabang Fitur:** feature-calendar-loader-linking

## Tautkan Impor Bersama Sekali

Pengujian dialog Kalender kini memuat setiap modul lokal satu kali dan menautkan seluruh graf dependensi sebelum evaluasi. Pengujian dengan impor yang sengaja ditumpangtindihkan mencakup pembacaan berkas yang tertunda agar dependensi bersama tidak menyebabkan kegagalan penautan modul yang sesekali terjadi. Perilaku Kalender saat dijalankan tidak berubah.

## Komit

- [3c4b218767135a93f1cb9cd7def3dece4507809e](https://github.com/Cognis-Labs-HQ/Cognis/commit/3c4b218767135a93f1cb9cd7def3dece4507809e)
