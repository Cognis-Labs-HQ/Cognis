# Referensi Teknis

Antarmuka publik dan aturan operasional Verifikasi Email.

## Antarmuka

Metode TFA menyediakan penyiapan dan verifikasi serta tujuan melalui notify:registerEmailPurpose. Pengiriman memakai notify:sendEmail dan notify:emailDeliveryPolicy.

## Konfigurasi

### Konfigurasi

Atur panjang kode pada penyedia pengiriman surel; metode ini membaca kebijakan terkininya.

## Perilaku

### Ringkasan

Adapter mendaftarkan aksi pesan kodenya sendiri saat bootstrap melalui `notify:registerEmailPurpose` dan mengirim melalui `notify:sendEmail`. Registrasi, isi kode, dan sinkronisasi pengirim dimiliki adapter ini. Gateway TFA hanya menyediakan hook siklus hidup adapter yang netral. Penonaktifan gateway membatalkan antrean SMTP miliknya; aktivasi ulang memulihkan registrasinya.

### Persyaratan

- Gateway Notification harus menyediakan pengiriman email verifikasi.
- Pengirim SMTP harus dikonfigurasi dan diaktifkan di administrasi gateway Notification.
- Akun pengguna harus memiliki email utama yang sudah terverifikasi.

### Perilaku runtime

- Kode challenge disimpan di memori proses. Restart aplikasi akan membatalkan kode setup/login yang masih menunggu.
- Pada deployment multi-instance, adapter ini sebaiknya dipakai hanya jika request selama jendela challenge diarahkan ke instance yang sama.

### Kebijakan Pengiriman

Panjang kode dan jeda pengiriman dibaca dari `notify:emailDeliveryPolicy`. Adapter tidak memiliki pengaturan panjang kode terpisah. Fungsi verifikasi bersama menghasilkan digit acak kriptografis; metode ini mendeklarasikan tampilan dan sumber bahasanya.

## Keamanan

Tantangan memerlukan email utama terverifikasi dan pengiriman tersedia. Kode hanya ada dalam proses dan batal saat restart; jangan masukkan kode atau rahasia ke antrean luring.

## Referensi

- [src/adapters/tfa/smtp/manifest.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/tfa/smtp/manifest.json)
- [src/adapters/tfa/smtp/package.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/tfa/smtp/package.json)
- [src/adapters/tfa/smtp/index.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/tfa/smtp/index.ts)
