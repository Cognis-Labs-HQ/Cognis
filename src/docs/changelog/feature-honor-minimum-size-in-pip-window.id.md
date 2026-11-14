# Mematuhi ukuran minimum PiP yang ditentukan penyedia

**Cabang Fitur:** feature-honor-minimum-size-in-pip-window

## Terapkan dimensi metadata PiP

Focus Control kini memvalidasi metadata lebar dan tinggi minimum yang dideklarasikan penyedia serta meneruskan dimensi tersebut ke pengendali jendela mengambang, sehingga jendela PiP yang diubah ukurannya mempertahankan ukuran minimum yang dapat digunakan menurut penyedia.

## Perbarui ukuran minimum PiP saat terbuka

Konsumen PiP kini dapat memperbarui dimensi minimum jendela mengambang melalui fungsi pembersihannya. Jika jendela yang terbuka lebih kecil daripada minimum baru yang valid, Cognis segera memperbesar dan memosisikannya kembali di dalam batas yang tersedia.

## Komit

- [f38004f](https://github.com/Cognis-Labs-HQ/Cognis/commit/f38004f3247f8a9c00277cf0f727615d55d1ccc5)
- [1d32579](https://github.com/Cognis-Labs-HQ/Cognis/commit/1d3257996e889a1a23fd7ebd316a0c280b7ebee3)
- [094c44d](https://github.com/Cognis-Labs-HQ/Cognis/commit/094c44dbc1be75bd716e3522942f694315a90722)
