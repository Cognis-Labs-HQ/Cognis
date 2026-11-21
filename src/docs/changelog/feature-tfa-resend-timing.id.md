# Waktu Kirim Ulang TFA

**Cabang Fitur:** feature-tfa-resend-timing

## Lanjutkan tanpa menunggu lagi

Melanjutkan tantangan login yang ada atau memilih metodenya kembali mempertahankan waktu absolut pengiriman ulang dari server. Waktu yang sudah berlalu tidak lagi memulai ulang waktu tunggu awal. Jika waktu absolut tidak tersedia atau tidak valid, durasi tunggu relatif dari penyedia tetap digunakan.

## Pertahankan perlindungan kirim ulang

Pengiriman ulang tetap nonaktif hingga waktunya tiba, dan batas server tetap berlaku setelah kontrol tersedia. Menampilkan atau melanjutkan tantangan yang ada tidak pernah mengirimkannya ulang secara otomatis. Panjang kode yang diterbitkan, verifikasi, pemilihan metode, dan kepemilikan percobaan login yang lebih baru tetap sama.

## Komit

- [59562cb8941363fa36516f7228ca73c03355d611](https://github.com/Cognis-Labs-HQ/Cognis/commit/59562cb8941363fa36516f7228ca73c03355d611)
- [11ad08e119e2452da0bd7a5d7f16014abd27cd50](https://github.com/Cognis-Labs-HQ/Cognis/commit/11ad08e119e2452da0bd7a5d7f16014abd27cd50)
