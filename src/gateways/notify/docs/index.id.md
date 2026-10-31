# Gateway Notifikasi

Gateway menyalurkan notifikasi melalui adapter pengirim opsional tanpa mewajibkan transport email. Adapter mengekspor `createNotificationSender()` dan mengelola konfigurasi, koneksi, antrean, serta pengiriman uji sendiri. Notifikasi dalam aplikasi tetap tersedia tanpa penyedia email.

## Kontrak Pengiriman

Komponen memakai kapabilitas ctx, bukan menyimpan implementasi gateway:

- `notify:dispatch` menggunakan pengirim kategori pilihan penerima dan pengirim yang selalu aktif.
- `notify:dispatchToRole` menemukan ID akun dan mengirim berdasarkan peran.
- `notify:listSenders` mengembalikan metadata publik. `requiresVerifiedEmail` menyatakan kebutuhan email tanpa bergantung pada ID pengirim.
- `notify:registerCategory(id, label)` hanya tersedia saat bootstrap. Pengirim membuat kanal dan fungsi pengiriman terikat. Kanal bersama bertahan sampai pemilik terakhir dilepas.

Kontrak penyedia diekspor dari `@cognis/core`. Bootstrap adapter menerima kapabilitas ctx dan fungsi registrasi host terbatas, bukan gateway konkret. Pengujian menggunakan `testSender(senderId, recipient, config)`.

## Aksi Email

Penyedia email opsional menyediakan `notify:registerEmailPurpose(id, action)`, `notify:sendEmail`, `notify:emailAvailable`, dan `notify:emailCodeLength`. Pemanggil menyediakan konten sendiri dan mendaftarkan tujuan miliknya hanya saat bootstrap. Pengiriman memerlukan tujuan tersebut, penerima, dan variabel; pengiriman tidak pernah membuat antrean. Alamat tersimpan tetap dapat dibaca tanpa penyedia email.

Verifikasi berlaku untuk akun lokal dan SSO. Kode dan token mengikat ID akun lengkap beserta alamat. Panjang kode berasal dari penyedia email, terpisah dari adapter TFA. Gangguan pengiriman tidak membatalkan kewajiban verifikasi. Pengaturan keamanan memakai `userValidationMode: "email"` atau `"none"`.

## Siklus Hidup

Penonaktifan dan pelepasan mencabut registrasi serta pengiriman tertunda miliknya. Pengaktifan kembali membuat kanal baru tanpa mengulang pesan yang dibatalkan. Pemilik lain dari kategori bersama tetap aktif. Aksi asinkron tidak boleh mengantre setelah registrasinya dicabut atau diganti.

## Kapabilitas Browser

`notify:emailClient` menyediakan permintaan email akun sendiri, domain tepercaya, `listUserEmails` administratif, `resendUserEmail` khusus daring, dan `emailAvailable` yang terikat siklus hidup. Pengaturan, Pengguna, dan Administrasi mengambilnya melalui ctx. Penyedia menyimpan serta mengantre perubahan email; verifikasi tetap daring. `GET /api/v1/notify/email-delivery` memerlukan autentikasi dan hanya mengembalikan ketersediaan tanpa konfigurasi penyedia.

Mode Luring dan Broadcast berbagi tumpukan banner di atas header. Mode Luring memiliki prioritas, tidak dapat ditutup, serta menyediakan pemeriksaan koneksi dan muat ulang setelah pulih. Kebijakan konfirmasi, penerima, dan jadwal Broadcast tetap terpisah. Latar dan kemampuan menciut diatur melalui kapabilitas banner bersama.
