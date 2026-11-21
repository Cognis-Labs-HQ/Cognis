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

- [39d7f5d412ab4f30b681e8a8d6bbf083205f5007](https://github.com/Cognis-Labs-HQ/Cognis/commit/39d7f5d412ab4f30b681e8a8d6bbf083205f5007)
- [f96cbfd66b0e194e0f7998c1501ab672c54b4f39](https://github.com/Cognis-Labs-HQ/Cognis/commit/f96cbfd66b0e194e0f7998c1501ab672c54b4f39)
- [ac26f8f8483db87f1b62717d5c1f231c12dda6e0](https://github.com/Cognis-Labs-HQ/Cognis/commit/ac26f8f8483db87f1b62717d5c1f231c12dda6e0)
- [c1d740bac56419be19780e79c4719f7a8b4e316a](https://github.com/Cognis-Labs-HQ/Cognis/commit/c1d740bac56419be19780e79c4719f7a8b4e316a)
