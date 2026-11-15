# Pengiriman Undangan CLI

**Cabang Fitur:** feature-cli-invite-integration

## Buat token tanpa email

Perintah token pendaftaran kini meminta pengiriman manual sesuai kontrak API pendaftaran saat ini. Perintah ini tidak menerima argumen email dan mengembalikan tautan pendaftaran tanpa mengirim email. Perintah undangan email secara eksplisit meminta pengiriman email. Pembatasan otorisasi dan domain yang ada tetap berlaku.

## Verifikasi hasil perintah

Pengujian dengan rute sebenarnya mencakup penerbitan anonim dan terikat email, penolakan masukan, kegagalan otorisasi, pembatasan domain, serta keluaran tautan yang disengaja tanpa membocorkannya ke log. CLI versi 0.4.3 menyertakan adapter Token Pendaftaran 0.1.42. Tautan yang dikembalikan bersifat rahasia; gunakan keluaran terperinci jika ringkasan memendekkan tautan.

## Commit

- [4b8d1785cf568c361b88e0eb43709e268ffd26a6](https://github.com/Cognis-Labs-HQ/Cognis/commit/4b8d1785cf568c361b88e0eb43709e268ffd26a6)
- [67c4b5ab64feb16d7e5afc1a9aa47b508690861d](https://github.com/Cognis-Labs-HQ/Cognis/commit/67c4b5ab64feb16d7e5afc1a9aa47b508690861d)
- [bc15ea040864c918c3c39840ff519cc094f144e1](https://github.com/Cognis-Labs-HQ/Cognis/commit/bc15ea040864c918c3c39840ff519cc094f144e1)
