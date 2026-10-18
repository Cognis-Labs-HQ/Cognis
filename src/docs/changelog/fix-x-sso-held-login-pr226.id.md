# Navigasi Callback

**Cabang Fitur:** fix-x-sso-held-login-pr226

## Pertahankan Otorisasi

Navigasi dokumen harus dipilih secara eksplisit: pemanggil yang memiliki tujuan hasil render server meneruskan `documentNavigation: true` ke `navigateTo`. Tujuan SPA yang tidak dikenal dan URL tidak valid menghasilkan false, sehingga pemanggil dapat menampilkan pemulihan seperti pemberitahuan perender berbagi yang hilang. Perlindungan navigasi dan pemeriksaan HTTP asal yang sama tetap berlaku, termasuk saat melanjutkan transisi yang dilindungi. `ui:log` menghasilkan status pengiriman boolean, melewati permintaan anonim, dan menangani kegagalan HTTP atau jaringan tanpa memicu peristiwa penolakan akses atau pemulihan koneksi. Umpan balik pengguna tetap menjadi tanggung jawab pemanggil; endpoint pencatatan tetap memerlukan autentikasi.

## Komit

- [72dfbc8](https://github.com/Cognis-Labs-HQ/Cognis/commit/72dfbc8c8f0b8b456ec5b59e5e2ad5e6652a2cad)
