# Perbaikan Whiteboard

## Warna gores otomatis langsung mengikuti tema

Objek whiteboard yang dibuat dengan warna gores otomatis kini menentukan warnanya saat dirender, sehingga langsung beralih antara warna tema terang dan gelap saat tema aplikasi berubah dan latar kanvas ikut digambar ulang.

## Permintaan penggantian nama whiteboard divalidasi dengan aman

Alur penggantian nama kini mempertahankan ID whiteboard yang andal, memangkas judul yang dikirim, dan mengembalikan galat validasi yang jelas untuk permintaan yang tidak valid alih-alih galat bad request umum.
