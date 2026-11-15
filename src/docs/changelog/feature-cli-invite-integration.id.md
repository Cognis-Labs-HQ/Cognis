# Pengiriman Undangan CLI

**Cabang Fitur:** feature-cli-invite-integration

## Buat token tanpa email

Perintah token pendaftaran kini meminta pengiriman manual sesuai kontrak API pendaftaran saat ini. Perintah ini tidak menerima argumen email dan mengembalikan tautan pendaftaran tanpa mengirim email. Perintah undangan email secara eksplisit meminta pengiriman email. Pembatasan otorisasi dan domain yang ada tetap berlaku.

## Verifikasi hasil perintah

Pengujian dengan rute sebenarnya mencakup penerbitan anonim dan terikat email, penolakan masukan, kegagalan otorisasi, pembatasan domain, serta keluaran tautan yang disengaja tanpa membocorkannya ke log. CLI versi 0.4.3 menyertakan adapter Token Pendaftaran 0.1.42. Tautan yang dikembalikan bersifat rahasia; gunakan keluaran terperinci jika ringkasan memendekkan tautan.

## Commit

- https://github.com/Cognis-Labs-HQ/Cognis/commit/b460321c4fa15861829de7ca1502cfa9bdfc18a9
