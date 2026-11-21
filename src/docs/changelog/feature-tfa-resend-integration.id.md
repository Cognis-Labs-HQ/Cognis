# Umpan Balik Ulang TFA

**Cabang Fitur:** feature-tfa-resend-integration

## Jelaskan hasil permintaan ulang

Login yang kedaluwarsa kini menjelaskan cara memulai kembali. Hasil lain yang ditolak atau belum pasti menampilkan kesalahan terjemahan, bukan diam-diam kembali ke tautan kirim ulang. Respons valid tanpa konfirmasi pengiriman menampilkan informasi netral tanpa mengklaim email telah dikirim.

## Pertahankan waktu tunggu

Batas waktu resmi, penguncian permintaan berjalan, dan percobaan ulang yang disengaja tetap berlaku. Respons sukses yang tidak valid mempertahankan batas kode yang telah diterbitkan. Tidak ada pengiriman ulang otomatis, perubahan kebijakan server, atau jaminan pengiriman.

## Pertahankan kepemilikan hasil

Perubahan akun dan sesi menghentikan tindakan pengiriman ulang serta umpan balik lama. Terjemahan wajib yang hilang tetap menjadi kesalahan yang jelas, bukan diganti dengan pesan lain.

## Lepaskan sumber daya formulir lama

Meninggalkan, mengganti, atau berhasil membatalkan Login kini langsung melepas pendengar kirim ulang dan penghitung waktu tanpa menunggu permintaan selesai. Pembatalan yang gagal mempertahankan formulir yang dapat digunakan. Pembersihan UI tidak menjanjikan pembatalan efek permintaan yang sudah dikirim.

## Pulihkan kirim ulang yang terinterupsi

Kirim ulang tertunda kini menampilkan label sibuk terlokalisasi. Pembatalan yang gagal memulihkan hasil dan sisa tenggat server tanpa percobaan ulang otomatis. Auth 2.2.14 dan TFA 1.3.14 memerlukan kontrak masa aktif browser berversi yang sama; terapkan JavaScript dan aset bersama lalu muat ulang tab Login lama.

## Tampilkan setiap konfirmasi sekali

Saat kembali ke suatu metode, setiap konfirmasi kirim ulang yang selesai ditampilkan sekali; berpindah lalu kembali lagi tidak mengulanginya.

## Komit

- [1b9d020c3d8820e1b5838fbd4c54e51e626fbd1f](https://github.com/Cognis-Labs-HQ/Cognis/commit/1b9d020c3d8820e1b5838fbd4c54e51e626fbd1f)
- [f3f810aa71ab0bbd7bdcb841be01ee5979834239](https://github.com/Cognis-Labs-HQ/Cognis/commit/f3f810aa71ab0bbd7bdcb841be01ee5979834239)
- [d43180248e4feb9d580f1fe7ce532c9dd7a6fbf6](https://github.com/Cognis-Labs-HQ/Cognis/commit/d43180248e4feb9d580f1fe7ce532c9dd7a6fbf6)
- [6fcc59f6db105cc068acb34e57837f7d14e66519](https://github.com/Cognis-Labs-HQ/Cognis/commit/6fcc59f6db105cc068acb34e57837f7d14e66519)
- [485f7e727dc7fffc158bad34a0f7ccec4dd4174e](https://github.com/Cognis-Labs-HQ/Cognis/commit/485f7e727dc7fffc158bad34a0f7ccec4dd4174e)
