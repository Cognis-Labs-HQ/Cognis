# Uji Kalender yang Andal

**Cabang Fitur:** feature-calendar-loader-linking

## Tautkan Impor Bersama Sekali

Pengujian dialog Kalender kini memuat setiap modul lokal satu kali dan menautkan seluruh graf dependensi sebelum evaluasi. Pengujian dengan impor yang sengaja ditumpangtindihkan mencakup pembacaan berkas yang tertunda agar dependensi bersama tidak menyebabkan kegagalan penautan modul yang sesekali terjadi. Perilaku Kalender saat dijalankan tidak berubah.

## Komit

- [983792abacfce6de3bda6ec69a6b9b85c8c1e634](https://github.com/Cognis-Labs-HQ/Cognis/commit/983792abacfce6de3bda6ec69a6b9b85c8c1e634)
