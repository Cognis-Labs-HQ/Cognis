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

- [781658c2c3040c882e8ccbb4c1a7f2f5a1dfcb5a](https://github.com/Cognis-Labs-HQ/Cognis/commit/781658c2c3040c882e8ccbb4c1a7f2f5a1dfcb5a)
