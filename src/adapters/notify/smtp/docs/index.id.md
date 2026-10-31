# Adapter Surel SMTP

## Bootstrap dan Kanal

SMTP memiliki registrasi aksi, penyusunan pesan, dan antrean. Daftarkan `notify:registerEmailPurpose` dengan pengenal lokal dan fungsi aksi yang membangun pesan dari variabel. Gateway, adapter, dan modul eksternal hanya mendaftar dalam lingkup bootstrap masing-masing; pengenal menyertakan pemilik. Auth, Registration, TFA, dan Share memiliki isi pesannya sendiri. SMTP tidak memiliki daftar tujuan atau templat aplikasi.

```js
const registerPurpose = ctx.getCapability("notify:registerEmailPurpose");
const purpose = await registerPurpose("digest", (variables) => ({
    subject: variables.subject,
    body: variables.body,
}));
const sendEmail = ctx.getCapability("notify:sendEmail");
await sendEmail({ purpose, recipientEmail, variables });
```

Setiap panggilan `notify:sendEmail` menyertakan tujuan yang sudah terdaftar dan variabel. `templateId` tidak digunakan lagi. Tujuan yang hilang atau tidak dikenal ditolak; aksi asinkron diperiksa kembali sebelum masuk antrean. Registrasi ditutup saat bootstrap selesai, gagal, atau melewati batas waktu. Hook penyelesaian gateway berjalan dengan pemilik yang sama setelah penyedia selesai melakukan bootstrap.

Kategori notifikasi memakai kemampuan `notify:registerCategory` yang sudah ada. SMTP membuat antrean saat registrasi dan mengembalikan fungsi pengiriman terikat kepada gateway. Gateway tetap netral terhadap pengirim. Pengiriman tidak membuat atau menebak tujuan; pengiriman SMTP langsung memerlukan tujuan terdaftar yang dinyatakan secara eksplisit.

Penonaktifan gateway dan pelepasan modul menghapus aksi miliknya serta membatalkan pengiriman tertunda. Aktivasi ulang memulihkan antrean baru tanpa mengirim ulang email yang dibatalkan. Kategori bersama tetap aktif selama pemilik terdaftar lainnya masih aktif. Penonaktifan pengirim SMTP juga menutup sesi dan membatalkan pengiriman tertunda; aktivasi ulang hanya memulihkan registrasi yang masih ada.

Jeda bawaan adalah lima belas detik per penerima yang dinormalisasi dalam setiap antrean. Antrean terpisah berjalan bersamaan. Hanya pengiriman berhasil yang memperbarui jeda. Riwayat menyimpan hingga 200 catatan selesai per antrean dalam memori. `sendEmail` mengembalikan tanda terima antrean yang sebenarnya; tanda terima antrean tidak menyatakan pengiriman SMTP telah berhasil.

Kontrak pengirim memakai `test(recipient, config)` umum dan hook bootstrap, kanal, serta siklus hidup opsional. Gateway memanggil `testSender(senderId, recipient, config)` tanpa metode khusus SMTP untuk pengujian, verifikasi, undangan, atau login. Fungsi bantu gateway khusus SMTP dan registrasi templat terpisah dihapus.

## Konfigurasi

Konfigurasikan `COGNIS_SMTP_HOST`, `COGNIS_SMTP_PORT` (587), `COGNIS_SMTP_FROM`, `COGNIS_SMTP_USER`/`COGNIS_SMTP_PASS` opsional serta `COGNIS_SMTP_SECURE` (`none`, `starttls` atau `tls`). Nama pengirim, host EHLO, kebijakan sertifikat/autentikasi dan panjang kode menggunakan pengaturan adapter yang ada. Pesan uji dapat membawa penggantian konfigurasi dalam antrean.
