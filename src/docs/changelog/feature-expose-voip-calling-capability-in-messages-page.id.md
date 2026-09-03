# Landasan panggilan video untuk Messages

**Cabang Fitur:** feature-expose-voip-calling-capability-in-messages-page

## Tindakan panggilan percakapan yang netral terhadap penyedia

Percakapan langsung dan grup kini menampilkan tindakan kamera video yang aksesibel ketika penyedia VoIP peramban tersedia. Tindakan tersebut mengirim seluruh keanggotaan ruang dan permintaan tampilan gambar-dalam-gambar melalui alur ctx bertahap tanpa mengikat Messages ke Jitsi.

## Penyedia VoIP modul dimuat sebelum Messages

Modul eksternal kini dapat mendeklarasikan kapabilitas peramban pada plug-in navigasi terdaftarnya. Cognis menyertakan skrip tersebut dalam penemuan penyedia kapabilitas sehingga Jitsi dapat menyediakan `voip:startCall` sebelum Messages memeriksa ketersediaan dan merender tindakan kamera video.

## Tindakan VoIP per ruang

Messages kini meminta tindakan kepada penyedia untuk setiap ruang. Penyedia dapat menyembunyikan panggilan, meminta jendela komponen milik host dengan konteks rapat, atau mengarahkan ke rapat yang sudah ada. Panggung komponen sementara dihapus setelah ditutup, sedangkan kegagalan peluncuran dicatat dan ditampilkan sebagai toast tanpa mengubah tinggi percakapan.

## Komit

- https://github.com/Cognis-Labs-HQ/Cognis/commit/9b6cc0e4d3118f80765af56f2b503c0e73aa1c10
- https://github.com/Cognis-Labs-HQ/Cognis/commit/fddbcbf8999173159b88ee4efddf284e426b9a67
- https://github.com/Cognis-Labs-HQ/Cognis/commit/9c16bf732cf74c071bc41201a303f57d3f561e30
