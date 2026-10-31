# Gateway Notifikasi

Tujuan SMTP harus didaftarkan melalui `ctx` selama bootstrap gateway atau modul. Dapatkan `notify:registerSmtpPurpose`, panggil dengan nama tujuan lokal, tunggu hasilnya dan simpan pengidentifikasi yang terikat pada pemilik. Setiap pendaftaran membuat antrean serta status jeda penerima tersendiri; adapter tidak memiliki daftar tujuan bawaan.

Setiap panggilan `notify:sendEmail` wajib menyertakan `purpose` yang sudah ada. Tujuan kosong atau tidak dikenal ditolak sebelum transport SMTP; pengiriman tidak dapat membuat tujuan secara implisit. Pendaftaran ditolak setelah bootstrap selesai, gagal atau kehabisan waktu, termasuk melalui callback tersimpan dan pekerjaan asinkron terpisah. Modul yang diaktifkan setelah startup dapat mendaftar selama bootstrap miliknya. Penonaktifan atau penghapusan modul membuang antreannya, menolak pengiriman tertunda dan menutup sesi SMTP aktif.

Amplop umum menyertakan `purpose`; metode khusus pengiriman dan antrean SMTP kini menerima tujuan sebagai argumen pertama. Metode uji gateway menerima `(senderId, purpose, recipientEmail, config)`. Pembantu Gateway Notifikasi yang ada menyediakan tujuan yang didaftarkan gateway tersebut. Pemanggil komponen/modul umum mendaftarkan tujuan sendiri saat bootstrap dan menggunakan kembali pengidentifikasinya saat runtime.

## Ikhtisar

Gateway Notifikasi mengirimkan notifikasi melalui adapter pengirim yang dapat dipasang. Gateway ini bertindak sebagai perantara antara bagian lain aplikasi dan mekanisme pengiriman konkret — SMTP, webhook di masa depan, atau sink dalam aplikasi — tanpa perlu mengetahui transport mana yang dikonfigurasi.

Gateway ini juga memiliki dua layanan khusus: `TfaCodeService` untuk menerbitkan dan memvalidasi kode autentikasi dua faktor, dan `VerifyTokenService` untuk alur verifikasi email. Adapter pengirim ditemukan dengan memindai `src/adapters/notify/` saat bootstrap. Adapter SMTP adalah satu-satunya pengirim bawaan; ia aktif secara otomatis ketika `COGNIS_SMTP_HOST` diatur.

## Tanggung Jawab

- Menemukan dan mendaftarkan adapter pengirim notifikasi dari `src/adapters/notify/` saat bootstrap.
- Mengirimkan amplop notifikasi ke semua pengirim yang diaktifkan untuk penerima dan kategori.
- Mempersistensikan dan memuat ulang konfigurasi pengirim dari database.
- Mendaftarkan kategori notifikasi `system`.
- Menyambungkan route penerbitan dan verifikasi kode TFA.
- Menyambungkan route token verifikasi email.

## Arsitektur

Kelas utama adalah `CoreNotificationGateway` di `src/gateways/notify/gateway.ts`.

```ts
export interface NotificationGateway {
    registerSender(sender: NotificationSender): void;
    dispatch(envelope: NotificationEnvelope): Promise<{ dispatched: string[] }>;
    registerCategory(id: string, label: string): void;
    listSenders(): NotificationSenderInfo[];
    listCategories(): NotificationCategory[];
}
```

| Path                                          | Tujuan                               |
| --------------------------------------------- | ------------------------------------ |
| `src/gateways/notify/gateway.ts`              | `CoreNotificationGateway`, antarmuka |
| `src/gateways/notify/bootstrap.ts`            | Titik masuk bootstrap                |
| `src/gateways/notify/routes/notifications.ts` | Route pengiriman dan pengelolaan     |
| `src/api/reuse/tfa-code.ts`                   | `TfaCodeService`                     |
| `src/api/reuse/verify-token.ts`               | `VerifyTokenService`                 |

## Route API

| Metode | Path                                        | Keterangan                             | Autentikasi |
| ------ | ------------------------------------------- | -------------------------------------- | ----------- |
| `POST` | `/api/v1/notify/send`                       | Kirim notifikasi                       | Admin       |
| `GET`  | `/api/v1/notify/providers`                  | Daftar pengirim terdaftar              | Pengguna    |
| `GET`  | `/api/v1/notify/categories`                 | Daftar kategori notifikasi             | Bearer      |
| `GET`  | `/api/v1/notify/preferences`                | Dapatkan preferensi notifikasi sendiri | Bearer      |
| `PUT`  | `/api/v1/notify/preferences`                | Perbarui preferensi notifikasi sendiri | Bearer      |
| `POST` | `/api/v1/notify/providers/:senderId/config` | Perbarui konfigurasi pengirim          | Admin       |
| `POST` | `/api/v1/notify/providers/:senderId/test`   | Kirim notifikasi uji coba              | Admin       |
| `POST` | `/api/v1/users/tfa/request`                 | Minta kode TFA                         | Bearer      |
| `POST` | `/api/v1/users/tfa/verify`                  | Verifikasi kode TFA                    | Bearer      |
| `POST` | `/api/v1/users/email/verify/request`        | Minta verifikasi email                 | Bearer      |
| `POST` | `/api/v1/users/email/verify`                | Selesaikan verifikasi email            | Bearer      |
| `GET`  | `/api/v1/users/:username/email`             | Dapatkan email utama pengguna          | Bearer      |
| `PUT`  | `/api/v1/users/:username/email`             | Atur email utama pengguna              | Bearer      |

## Verifikasi Email

Verifikasi SMTP berlaku untuk akun SSO dan akun lokal. Pengiriman ulang menggunakan layanan pengiriman notifikasi yang dikonfigurasi. Kode dan tautan verifikasi mengikat ID akun lengkap dan email sebagai tupel buram, termasuk ID SSO dengan ruang nama. Membatalkan verifikasi dari Pengaturan mempertahankan alamat email yang ada.

## Banner atas bersama

Mode Luring dan Broadcast memakai satu tumpukan lengket di bagian paling atas dokumen, di atas header aplikasi. Mode Luring mendapat prioritas, tidak dapat ditutup, dan tetap menyediakan Periksa Ulang Koneksi serta Muat Ulang setelah pulih. Menghapus pengumuman tidak menghapus Mode Luring. Broadcast melewati permintaan jaringan saat terputus; penyedianya membersihkan banner dan pengatur waktu ketika dilepas.

## Pengaturan Pribadi Luring

Proses masuk terverifikasi menyiapkan daftar email akun dan kebijakan domain tepercaya tanpa membuka Pengaturan. Penambahan, penghapusan, serta perubahan alamat utama ditampilkan secara lokal dan diantrekan melalui `notify:emailClient` serta pemilik antrean terlindungi `notify.emails`. Validasi server tetap menentukan hasil akhir. Verifikasi email, pengiriman ulang, dan tindakan siklus hidup akun memerlukan koneksi; kode, token pemantauan, dan kata sandi tidak masuk antrean. Alamat baru tetap belum terverifikasi hingga diverifikasi secara daring. Pengiriman berhasil memperbarui snapshot email; kegagalan penyegaran opsional tidak mengubah penulisan tersimpan menjadi tindakan gagal. Snapshot privat terbatas ini tetap terikat tab dan sesi.

## Batas Sesi dan Komponen

Kapabilitas `notify:emailClient` yang mengikuti siklus hidup menyediakan permintaan akun sendiri dan domain tepercaya, `listUserEmails` administratif, `resendUserEmail` khusus daring, serta `smtpAvailable`. Setiap tindakan melewati tahapan terdaftar dan berhenti saat penyedianya dilepas. Pengaturan, Pengguna, dan Administrasi mengambil metode melalui ctx tanpa mengimpor implementasi UI Notify. Jika Notify tidak tersedia, pengelolaan email disembunyikan sementara kontrol akun lain tetap dapat digunakan.

## Notifikasi Berdasarkan ID Akun

Notifikasi berdasarkan peran menggunakan `accountId` yang tetap agar menjangkau pengguna SSO dengan nama pengguna publik yang berbeda. `notify:dispatchToRole` mengembalikan ID penerima kanonis; nama pengguna publik tetap menjadi data tampilan.
