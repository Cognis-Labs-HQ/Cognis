# Uji Kalender yang Andal

**Cabang Fitur:** feature-calendar-loader-linking

## Tautkan Impor Bersama Sekali

Pengujian dialog Kalender kini memuat setiap modul lokal satu kali dan menautkan seluruh graf dependensi sebelum evaluasi. Pengujian dengan impor yang sengaja ditumpangtindihkan mencakup pembacaan berkas yang tertunda agar dependensi bersama tidak menyebabkan kegagalan penautan modul yang sesekali terjadi. Perilaku Kalender saat dijalankan tidak berubah.

## Komit

- [fa0627211544875e4063801f7f63a95f61f028c9](https://github.com/Cognis-Labs-HQ/Cognis/commit/fa0627211544875e4063801f7f63a95f61f028c9)
