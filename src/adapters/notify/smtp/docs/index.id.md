# Adapter Surel SMTP

SMTP mendukung TCP biasa, STARTTLS dan TLS, autentikasi opsional serta percobaan ulang terbatas untuk kegagalan sementara. Templat didaftarkan melalui Gateway Notifikasi; transport membuat MIME, membersihkan header dan mendukung lampiran. Semua jalur pengiriman menggunakan antrean terpilih. `send` menunggu pengiriman; `sendTracked` langsung mengembalikan tanda terima.

## Tujuan Saat Bootstrap

Tujuan SMTP harus didaftarkan melalui `ctx` selama bootstrap gateway atau modul. Dapatkan `notify:registerSmtpPurpose`, panggil dengan nama tujuan lokal, tunggu hasilnya dan simpan pengidentifikasi yang terikat pada pemilik. Setiap pendaftaran membuat antrean serta status jeda penerima tersendiri; adapter tidak memiliki daftar tujuan bawaan.

```js
const registerPurpose = ctx.getCapability("notify:registerSmtpPurpose");
const purpose = await registerPurpose("digest");
const sendEmail = ctx.getCapability("notify:sendEmail");
await sendEmail({ purpose, recipientEmail, templateId, variables });
```

Setiap panggilan `notify:sendEmail` wajib menyertakan `purpose` yang sudah ada. Tujuan kosong atau tidak dikenal ditolak sebelum transport SMTP; pengiriman tidak dapat membuat tujuan secara implisit. Pendaftaran ditolak setelah bootstrap selesai, gagal atau kehabisan waktu, termasuk melalui callback tersimpan dan pekerjaan asinkron terpisah. Modul yang diaktifkan setelah startup dapat mendaftar selama bootstrap miliknya. Penonaktifan atau penghapusan modul membuang antreannya, menolak pengiriman tertunda dan menutup sesi SMTP aktif.

## Pengiriman dan Antrean

Jeda standar adalah lima belas detik per penerima yang dinormalisasi dalam setiap tujuan. Tujuan independen diproses bersamaan sehingga koneksi lambat, percobaan ulang atau jeda tidak menghambat antrean lain. Jeda hanya diperbarui setelah pengiriman berhasil. Pemeriksaan antrean menggabungkan semua tujuan, menyertakan pengidentifikasinya dan menyimpan hingga 200 catatan selesai per antrean dalam memori.

Amplop umum menyertakan `purpose`; metode khusus pengiriman dan antrean SMTP kini menerima tujuan sebagai argumen pertama. Metode uji gateway menerima `(senderId, purpose, recipientEmail, config)`. Pembantu Gateway Notifikasi yang ada menyediakan tujuan yang didaftarkan gateway tersebut. Pemanggil komponen/modul umum mendaftarkan tujuan sendiri saat bootstrap dan menggunakan kembali pengidentifikasinya saat runtime.

## Konfigurasi

Konfigurasikan `COGNIS_SMTP_HOST`, `COGNIS_SMTP_PORT` (587), `COGNIS_SMTP_FROM`, `COGNIS_SMTP_USER`/`COGNIS_SMTP_PASS` opsional serta `COGNIS_SMTP_SECURE` (`none`, `starttls` atau `tls`). Nama pengirim, host EHLO, kebijakan sertifikat/autentikasi dan panjang kode menggunakan pengaturan adapter yang ada. Pesan uji dapat membawa penggantian konfigurasi dalam antrean.
