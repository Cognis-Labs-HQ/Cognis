# Adapter TFA SMTP

## Ringkasan

Adapter mendaftarkan aksi pesan kodenya sendiri saat bootstrap melalui `notify:registerSmtpPurpose` dan mengirim melalui `notify:sendEmail`. Registrasi, isi kode, dan sinkronisasi pengirim dimiliki adapter ini. Gateway TFA hanya menyediakan hook siklus hidup adapter yang netral. Penonaktifan gateway membatalkan antrean SMTP miliknya; aktivasi ulang memulihkan registrasinya.

## Persyaratan

- Gateway Notification harus menyediakan pengiriman email verifikasi.
- Pengirim SMTP harus dikonfigurasi dan diaktifkan di administrasi gateway Notification.
- Akun pengguna harus memiliki email utama yang sudah terverifikasi.

## Konfigurasi

- `codeLength` (angka, opsional): Panjang kode numerik yang dihasilkan. Nilai dibatasi ke rentang 4–10 digit.

## Perilaku runtime

- Kode challenge disimpan di memori proses. Restart aplikasi akan membatalkan kode setup/login yang masih menunggu.
- Pada deployment multi-instance, adapter ini sebaiknya dipakai hanya jika request selama jendela challenge diarahkan ke instance yang sama.
