# Perbaikan SMTP

## Fallback EHLO Lebih Baik

Adapter SMTP sekarang menentukan hostname EHLO dengan lebih aman saat `HOST` tidak disetel. Urutannya adalah `ehloHostname`, lalu domain pengirim dari `from`, lalu host SMTP, dan `localhost` hanya sebagai opsi terakhir.

Perubahan ini mengurangi penolakan SMTP pada server yang tidak menerima `EHLO localhost`.

## Cakupan Regresi SMTP

Ditambahkan tes adapter SMTP yang terfokus untuk memastikan pengiriman email uji memakai fallback EHLO berbasis domain pengirim ketika nilai lingkungan `HOST` tidak tersedia.
