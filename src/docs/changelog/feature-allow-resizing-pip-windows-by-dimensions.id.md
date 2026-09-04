# Menyesuaikan ukuran minimum PiP dengan orientasi

**Cabang Fitur:** feature-allow-resizing-pip-windows-by-dimensions

## Menukar dimensi minimum PiP saat mengubah ukuran

Dimensi minimum PiP kini beralih dengan cepat mengikuti lebar dan tinggi relatif dari gerakan pengubahan ukuran. Rentang histeresis mencegah gerakan penunjuk kecil di dekat batas berulang kali berosilasi antara orientasi horizontal dan vertikal.

## Menjaga tindakan halaman di atas jendela PiP

Jendela PiP kini tetap berada dalam konteks tumpukan dokumen sehingga tingkat tumpukan dok tindakan halaman yang lebih tinggi dapat menjaga tombolnya tetap dapat diakses secara andal.

## Komit

- [587c4fd](https://github.com/Cognis-Labs-HQ/Cognis/commit/587c4fd331054f67b804b97795620b48f64541dd)
