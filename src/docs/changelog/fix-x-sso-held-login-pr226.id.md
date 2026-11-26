# Navigasi Callback

**Cabang Fitur:** fix-x-sso-held-login-pr226

## Pertahankan Otorisasi

Callback autentikasi mandiri menggunakan `navigateToDocument(path, { signal })` dari `page-entry.js` untuk perpindahan dokumen server. Fungsi ini memvalidasi URL HTTP(S) asal yang sama tanpa kredensial tertanam, mematuhi penjaga navigasi yang ada, dan mencegah navigasi setelah pembatalan. Navigasi dasbor dan perilaku perender yang tidak tersedia tetap ditangani router SPA yang tidak diubah. `ui:log` melewati permintaan anonim dan menangani kegagalan pengiriman; endpoint pencatatan tetap memerlukan autentikasi.

## Komit

- [72dfbc8](https://github.com/Cognis-Labs-HQ/Cognis/commit/72dfbc8c8f0b8b456ec5b59e5e2ad5e6652a2cad)
- [9a9387b](https://github.com/Cognis-Labs-HQ/Cognis/commit/9a9387b199dfa3208b83a51aa66d3820a915297a)
- [aad15f0](https://github.com/Cognis-Labs-HQ/Cognis/commit/aad15f0cca5eaa3e93ac08eec5e27f72d8b95163)
