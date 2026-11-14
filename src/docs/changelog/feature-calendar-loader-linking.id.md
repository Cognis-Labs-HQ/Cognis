# Uji Kalender yang Andal

**Cabang Fitur:** feature-calendar-loader-linking

## Tautkan Impor Bersama Sekali

Pengujian dialog Kalender kini memuat setiap modul lokal satu kali dan menautkan seluruh graf dependensi sebelum evaluasi. Pengujian dengan impor yang sengaja ditumpangtindihkan mencakup pembacaan berkas yang tertunda agar dependensi bersama tidak menyebabkan kegagalan penautan modul yang sesekali terjadi. Perilaku Kalender saat dijalankan tidak berubah.

## Komit

- [3fe6763b3906be8ba0662b5a2431dcefca4a2f10](https://github.com/Cognis-Labs-HQ/Cognis/commit/3fe6763b3906be8ba0662b5a2431dcefca4a2f10)
