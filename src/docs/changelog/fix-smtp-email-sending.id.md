# Perbaikan SMTP

## Fallback EHLO Lebih Baik

Adapter SMTP sekarang menentukan hostname EHLO berdasarkan host relay SMTP yang dikonfigurasi, lalu fallback ke `localhost` hanya sebagai opsi terakhir.

Perubahan ini mengurangi penolakan SMTP pada server yang tidak menerima `EHLO localhost`.

## Cakupan Regresi SMTP

Ditambahkan cakupan tes adapter SMTP terfokus untuk memastikan email uji memakai identitas EHLO host relay, bukan domain pengirim.

## Error Tes SMTP Lebih Jelas

Endpoint tes SMTP sekarang mengembalikan detail kegagalan terstruktur yang aman untuk pengguna, alih-alih jatuh ke respons bad request yang generik. Untuk kegagalan perintah SMTP tertentu (misalnya penolakan `RCPT TO`), API kini menyertakan perintah SMTP yang gagal serta kode respons server.

Alur email uji di Administration kini membaca payload error API tersebut dan menampilkan pesan kegagalan spesifik langsung di toast, sehingga operator bisa segera melihat alasan penolakan pengiriman.

## Delegasi Identitas HELO

Pengiriman SMTP sekarang tidak lagi menurunkan identitas EHLO/HELO dari `HOST` atau domain pengirim pada `from`. Adapter kini mengidentifikasi diri menggunakan host relay SMTP yang dikonfigurasi, dan hanya fallback ke `localhost` jika host relay tidak tersedia.

Dengan ini, kebijakan identitas pengirim diserahkan ke mail server terdekat, bukan memaksa identitas HELO di level aplikasi yang bisa memicu penolakan SPF `helo`.
