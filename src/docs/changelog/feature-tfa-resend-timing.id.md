# Waktu Kirim Ulang TFA

**Cabang Fitur:** feature-tfa-resend-timing

## Lanjutkan tanpa menunggu lagi

Melanjutkan tantangan login yang ada atau memilih metodenya kembali mempertahankan waktu absolut pengiriman ulang dari server. Waktu yang sudah berlalu tidak lagi memulai ulang waktu tunggu awal. Jika waktu absolut tidak tersedia atau tidak valid, durasi tunggu relatif dari penyedia tetap digunakan.

## Pertahankan perlindungan kirim ulang

Pengiriman ulang tetap nonaktif hingga waktunya tiba, dan batas server tetap berlaku setelah kontrol tersedia. Menampilkan atau melanjutkan tantangan yang ada tidak pernah mengirimkannya ulang secara otomatis. Panjang kode yang diterbitkan, verifikasi, pemilihan metode, dan kepemilikan percobaan login yang lebih baru tetap sama.

## Komit

- [b9626f82768c4c4905de9096bac067b3e49b4d9e](https://github.com/Cognis-Labs-HQ/Cognis/commit/b9626f82768c4c4905de9096bac067b3e49b4d9e)
- [838d72afd60749a85cd167bd7d0d28c5707c01cc](https://github.com/Cognis-Labs-HQ/Cognis/commit/838d72afd60749a85cd167bd7d0d28c5707c01cc)
