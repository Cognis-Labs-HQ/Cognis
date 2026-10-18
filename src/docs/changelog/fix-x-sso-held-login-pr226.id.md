# Navigasi Callback

**Cabang Fitur:** fix-x-sso-held-login-pr226

## Pertahankan Otorisasi

`navigateTo` menggunakan navigasi dokumen asal yang sama dengan perlindungan ketika tujuan tidak memiliki rute SPA, sesuai perilaku tautan host dan riwayat browser. Tujuan lintas asal ditolak. `ui:log` menghasilkan status pengiriman boolean, melewati permintaan anonim, dan menangani kegagalan HTTP atau jaringan tanpa memicu peristiwa penolakan akses atau pemulihan koneksi. Umpan balik pengguna tetap menjadi tanggung jawab pemanggil; endpoint pencatatan tetap memerlukan autentikasi.

## Komit

- [72dfbc8](https://github.com/Cognis-Labs-HQ/Cognis/commit/72dfbc8c8f0b8b456ec5b59e5e2ad5e6652a2cad)
