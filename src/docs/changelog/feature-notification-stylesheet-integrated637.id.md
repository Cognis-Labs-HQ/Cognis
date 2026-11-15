# Pemulihan Gaya Notifikasi

**Cabang Fitur:** feature-notification-stylesheet-integrated637

## Pulihkan tampilan setelah kegagalan

Notifikasi Internal berbagi satu upaya pemuatan lembar gaya dengan tenggat lima detik. Kesalahan dan batas waktu membiarkan kotak masuk tersedia dengan peringatan terjemahan; pemasangan penyedia berikutnya dapat meminta lembar gaya baru. Pembatalan mempertahankan penunggu lain dan gaya eksternal yang berfungsi, sementara hasil terlambat tidak dapat menghidupkan kembali penyedia yang telah dihentikan.

## Pertahankan perilaku kotak masuk

Tindakan notifikasi, pemeriksaan berkala, siklus hidup notifikasi masuk, dan tutorial ruang kerja tidak berubah. Adaptor Notifikasi Internal kini menggunakan versi 0.5.38.

## Komit

- [e13e0df42cf4e5f067992a3e289de9cf303c9223](https://github.com/Cognis-Labs-HQ/Cognis/commit/e13e0df42cf4e5f067992a3e289de9cf303c9223)
