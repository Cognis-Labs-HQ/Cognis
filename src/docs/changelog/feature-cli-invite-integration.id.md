# Pengiriman Undangan CLI

**Cabang Fitur:** feature-cli-invite-integration

## Buat token tanpa email

Perintah token pendaftaran kini meminta pengiriman manual sesuai kontrak API pendaftaran saat ini. Perintah ini tidak menerima argumen email dan mengembalikan tautan pendaftaran tanpa mengirim email. Perintah undangan email secara eksplisit meminta pengiriman email. Pembatasan otorisasi dan domain yang ada tetap berlaku.

## Verifikasi hasil perintah

Pengujian dengan rute sebenarnya mencakup penerbitan anonim dan terikat email, penolakan masukan, kegagalan otorisasi, pembatasan domain, serta keluaran tautan yang disengaja tanpa membocorkannya ke log. CLI versi 0.4.3 menyertakan adapter Token Pendaftaran 0.1.42. Tautan yang dikembalikan bersifat rahasia; gunakan keluaran terperinci jika ringkasan memendekkan tautan.

## Commit

- [17f97e6650f61cb7c3eebb2d2bcff3632e89bd07](https://github.com/Cognis-Labs-HQ/Cognis/commit/17f97e6650f61cb7c3eebb2d2bcff3632e89bd07)
