# Sinkronisasi Tema Jitsi

**Cabang Fitur:** feature-update-jitsi-meet-window-theme-handling

## Pembaruan tema Jitsi Meet langsung

Jendela Jitsi Meet kini menerima tema aplikasi aktif secara langsung setiap kali tema aplikasi berubah, sehingga meeting tertanam segera beralih antara mode terang dan gelap tanpa menunggu status tema yang disimpan.

## Permukaan Jitsi tersemat mengikuti tema

Embed rapat sekarang menerapkan ulang warna terang dan gelap Cognis ke shell iframe Jitsi, bilah alat, filmstrip peserta, dan kartu peserta saat rapat dimuat serta saat tema aplikasi berubah.

## Perubahan tema memuat ulang embed usang

Saat tema Cognis aktif berubah selama rapat berjalan, embed menyegarkan jendela Jitsi dengan konfigurasi antarmuka baru sehingga deployment yang mengabaikan pembaruan langsung `preferredTheme` tetap memakai tema yang benar.

## Komit

- [8344f54](https://github.com/Cognis-Labs-HQ/Cognis/commit/8344f54c3af4936f1812de28754555ba886a945c)
