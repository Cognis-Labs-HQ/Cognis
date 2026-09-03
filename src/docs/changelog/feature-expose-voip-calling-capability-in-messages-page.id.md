# Landasan panggilan video untuk Messages

**Cabang Fitur:** feature-expose-voip-calling-capability-in-messages-page

## Tindakan panggilan percakapan yang netral terhadap penyedia

Percakapan langsung dan grup kini menampilkan tindakan kamera video yang aksesibel ketika penyedia VoIP peramban tersedia. Tindakan tersebut mengirim seluruh keanggotaan ruang dan permintaan tampilan gambar-dalam-gambar melalui alur ctx bertahap tanpa mengikat Messages ke Jitsi.

## Penyedia VoIP modul dimuat sebelum Messages

Modul eksternal kini dapat mendeklarasikan kapabilitas peramban pada plug-in navigasi terdaftarnya. Cognis menyertakan skrip tersebut dalam penemuan penyedia kapabilitas sehingga Jitsi dapat menyediakan `voip:startCall` sebelum Messages memeriksa ketersediaan dan merender tindakan kamera video.

## Tindakan VoIP per ruang

Messages kini meminta tindakan kepada penyedia untuk setiap ruang. Penyedia dapat menyembunyikan panggilan, meminta jendela komponen milik host dengan konteks rapat, atau mengarahkan ke rapat yang sudah ada. Panggung komponen sementara dihapus setelah ditutup, sedangkan kegagalan peluncuran dicatat dan ditampilkan sebagai toast tanpa mengubah tinggi percakapan.

## Panggilan sebaris berpindah rapi ke gambar-dalam-gambar

Komponen panggilan kini terbuka di antara area tajuk utas dan daftar pesan, selaras dengan pendekatan jendela komponen tertanam pada papan tulis rapat. Kontrol kembali di kiri atas memindahkan panggilan ke gambar-dalam-gambar, memulihkan tata letak Messages yang normal, dan tidak meninggalkan panggung usang setelah panggilan ditutup.

## Gaya tombol bertahan setelah Meetings

Gaya tombol konsekuensi bersama kini berada dalam lembar gaya pakai ulang tersendiri dan tetap dimuat untuk shell dasbor. Saat meninggalkan Meetings, hanya gaya khusus rutenya yang dibongkar sehingga tombol netral pada menu samping dan tindakan mempertahankan bingkai, warna, status sorot, dan status nonaktif di setiap halaman tujuan.

## Komit

- https://github.com/Cognis-Labs-HQ/Cognis/commit/9b6cc0e4d3118f80765af56f2b503c0e73aa1c10
- https://github.com/Cognis-Labs-HQ/Cognis/commit/fddbcbf8999173159b88ee4efddf284e426b9a67
- https://github.com/Cognis-Labs-HQ/Cognis/commit/9c16bf732cf74c071bc41201a303f57d3f561e30
- https://github.com/Cognis-Labs-HQ/Cognis/commit/69e21d58c8f04c27848c9b646672d6a436891d2c
- https://github.com/Cognis-Labs-HQ/Cognis/commit/2b179ef3cd20fab51af1eac5fa36506bf46021c6
