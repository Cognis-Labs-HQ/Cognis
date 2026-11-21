# Pemulihan Gaya Notifikasi

**Cabang Fitur:** feature-notification-stylesheet-integrated637

## Pulihkan tampilan setelah kegagalan

Notifikasi Internal berbagi satu upaya pemuatan lembar gaya dengan tenggat lima detik. Kesalahan dan batas waktu membiarkan kotak masuk tersedia dengan peringatan terjemahan; pemasangan penyedia berikutnya dapat meminta lembar gaya baru. Pembatalan mempertahankan penunggu lain dan gaya eksternal yang berfungsi, sementara hasil terlambat tidak dapat menghidupkan kembali penyedia yang telah dihentikan.

## Pertahankan perilaku kotak masuk

Tindakan notifikasi, pemeriksaan berkala, siklus hidup notifikasi masuk, dan tutorial ruang kerja tidak berubah. Adaptor Notifikasi Internal kini menggunakan versi 0.5.38.

## Komit

- [5c081737d6026b5c0fc23e57fe43b8e5da76d499](https://github.com/Cognis-Labs-HQ/Cognis/commit/5c081737d6026b5c0fc23e57fe43b8e5da76d499)
