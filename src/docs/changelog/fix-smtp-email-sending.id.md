# Perbaikan SMTP

## Fallback EHLO Lebih Baik

Adapter SMTP sekarang menentukan hostname EHLO dengan lebih aman saat `HOST` tidak disetel. Urutannya adalah `ehloHostname`, lalu domain pengirim dari `from`, lalu host SMTP, dan `localhost` hanya sebagai opsi terakhir.

Perubahan ini mengurangi penolakan SMTP pada server yang tidak menerima `EHLO localhost`.

## Cakupan Regresi SMTP

Ditambahkan tes adapter SMTP yang terfokus untuk memastikan pengiriman email uji memakai fallback EHLO berbasis domain pengirim ketika nilai lingkungan `HOST` tidak tersedia.

## Error Tes SMTP Lebih Jelas

Endpoint tes SMTP sekarang mengembalikan detail kegagalan terstruktur yang aman untuk pengguna, alih-alih jatuh ke respons bad request yang generik. Untuk kegagalan perintah SMTP tertentu (misalnya penolakan `RCPT TO`), API kini menyertakan perintah SMTP yang gagal serta kode respons server.

Alur email uji di Administration kini membaca payload error API tersebut dan menampilkan pesan kegagalan spesifik langsung di toast, sehingga operator bisa segera melihat alasan penolakan pengiriman.
