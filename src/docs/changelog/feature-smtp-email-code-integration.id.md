# Panjang Kode Email Bersama

**Cabang Fitur:** feature-smtp-email-code-integration

## Satu pengaturan SMTP untuk kode email

Bidang Panjang Kode pada SMTP Notifikasi mengatur verifikasi email serta penyiapan dan login TFA Kode Email. Tooltip informasi yang diterjemahkan menjelaskan kebijakan bersama, nilai bawaan 6 digit, dan rentang 4–10 digit. Konsumen membaca kebijakan SMTP terkini saat menerbitkan kode tanpa menyimpan pengaturan panjang kode kedua. Bidang konfigurasi numerik yang kosong mempertahankan nilai yang sudah ada.

## Tantangan yang ada mempertahankan panjangnya

Perubahan pengaturan SMTP berlaku untuk kode yang baru diterbitkan, termasuk pengganti dari pengiriman ulang. Kode penyiapan dan login yang masih menunggu mempertahankan panjang saat diterbitkan sampai digunakan, diganti, atau kedaluwarsa. Masukan penyiapan dan login menggunakan metadata panjang tantangan aktif. Verifikasi email wajib menerima seluruh kode tertunda tanpa batas masukan tetap yang terpisah.

Melanjutkan login tertunda setelah memuat ulang halaman mempertahankan panjang masukan saat kode diterbitkan tanpa mengirim kode lain. Perubahan kebijakan penyedia berikutnya berlaku untuk tantangan yang baru diterbitkan; respons lama tidak dapat menggantikan permintaan login yang lebih baru.

## Pengirim yang tidak tersedia gagal secara eksplisit

Penerbitan kode verifikasi email dan TFA Kode Email memerlukan pemilik kebijakan SMTP yang tersedia dan sudah dikonfigurasi. Pemilik yang tidak ada atau dinonaktifkan tidak diam-diam digantikan dengan nilai bawaan konsumen. Penonaktifan metode SMTP atau gateway menghapus tantangan tertunda; aktivasi ulang dimulai dengan status baru.

## Kontrak ekstensi dan konfigurasi aman

Kapabilitas mandiri `notify:emailCodeLength` dihapus. Konsumen ekstensi harus membaca `notify:emailDeliveryPolicy().codeLength`; terapkan gateway Notifikasi dan kedua adapter email bersama-sama. Konfigurasi penyedia dinormalisasi dan disimpan sebelum diterapkan saat runtime. Kegagalan penerapan menonaktifkan penyedia dan memulihkan konfigurasi tersimpan sebelumnya dalam keadaan nonaktif untuk pemulihan oleh administrator. Autentikasi SMTP biasa dan persetujuan verifikasi email tidak berubah.

Penyimpanan dan pembaruan konfigurasi, perubahan aktivasi, serta pemuatan ulang konfigurasi tersimpan dijalankan berurutan per pengirim, termasuk pemulihan setelah penyimpanan gagal. Pengirim yang berbeda tetap independen. Penggantian pengirim terdaftar saat pekerjaan konfigurasi masih berlangsung gagal secara eksplisit; penggantian dapat dilakukan setelah pekerjaan selesai. Listener konfigurasi berjalan setelah transaksi dilepas sehingga dapat menunggu pembaruan berikutnya. Muatan `notify:onSenderConfigChange` mengecualikan semua bidang yang dideklarasikan sebagai `password` dalam skema penyedia atau dicantumkan oleh `getConfiguredSecretFields()`, termasuk nilai yang baru dikirim. Bidang publik yang dinormalisasi dan status aktivasi tetap tersedia; listener tidak boleh bergantung pada kredensial mentah.

## Komit

- [55da5f3d0f7695d4cf5ea17438be5744857c3a7b](https://github.com/Cognis-Labs-HQ/Cognis/commit/55da5f3d0f7695d4cf5ea17438be5744857c3a7b)
- [8d2f4505fdd739d60dd8b82d2529d0dd30e87f40](https://github.com/Cognis-Labs-HQ/Cognis/commit/8d2f4505fdd739d60dd8b82d2529d0dd30e87f40)
- [ef8da51a32748d419b9b46e0bf145b65fed73678](https://github.com/Cognis-Labs-HQ/Cognis/commit/ef8da51a32748d419b9b46e0bf145b65fed73678)
- [8dd1b77ec99af1e828aaaddb10b8b47592206259](https://github.com/Cognis-Labs-HQ/Cognis/commit/8dd1b77ec99af1e828aaaddb10b8b47592206259)
- [3a857dd36040f814548f68386c3438b7653b533f](https://github.com/Cognis-Labs-HQ/Cognis/commit/3a857dd36040f814548f68386c3438b7653b533f)
