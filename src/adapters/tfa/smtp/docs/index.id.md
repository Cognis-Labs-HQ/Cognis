# Adapter TFA SMTP

## Ringkasan

Adapter mendaftarkan aksi pesan kodenya sendiri saat bootstrap melalui `notify:registerEmailPurpose` dan mengirim melalui `notify:sendEmail`. Registrasi, isi kode, dan sinkronisasi pengirim dimiliki adapter ini. Gateway TFA hanya menyediakan hook siklus hidup adapter yang netral. Penonaktifan gateway membatalkan antrean SMTP miliknya; aktivasi ulang memulihkan registrasinya.

## Persyaratan

- Gateway Notification harus menyediakan pengiriman email verifikasi.
- Pengirim SMTP harus dikonfigurasi dan diaktifkan di administrasi gateway Notification.
- Akun pengguna harus memiliki email utama yang sudah terverifikasi.

## Konfigurasi

Atur panjang kode pada penyedia pengiriman surel; metode ini membaca kebijakan terkininya.

## Perilaku runtime

- Kode challenge disimpan di memori proses. Restart aplikasi akan membatalkan kode setup/login yang masih menunggu.
- Pada deployment multi-instance, adapter ini sebaiknya dipakai hanya jika request selama jendela challenge diarahkan ke instance yang sama.

## Kebijakan Pengiriman

Panjang kode dan jeda pengiriman dibaca dari `notify:emailDeliveryPolicy`. Adapter tidak memiliki pengaturan panjang kode terpisah. Fungsi verifikasi bersama menghasilkan digit acak kriptografis; metode ini mendeklarasikan tampilan dan sumber bahasanya.
