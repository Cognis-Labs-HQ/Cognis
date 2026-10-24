# Reset Kata Sandi Auth

**Cabang Fitur:** copilot/add-password-reset-option

## Summary

Ditambahkan alur reset kata sandi berbasis provider di Pengaturan Pengguna → Keamanan, termasuk route server yang mengevaluasi dukungan reset dari provider aktif dan menjalankan logika reset milik adapter.

Registrasi section Administration → Authentication dihapus agar kontrol provider autentikasi dikelola lewat permukaan konfigurasi adapter.

Adapter auth dimatangkan dengan kontrak kemampuan reset kata sandi dan pengaturan LDAP writeback opt-in melalui skema konfigurasi adapter.

Error runtime pada bagian Keamanan di halaman Settings diperbaiki dengan mengikat section ke root Settings yang benar; string keamanan yang hilang juga diperbaiki dengan menambahkan penggabungan i18n berbasis bundle komponen untuk settings section.

Pesan “Penyedia Autentikasi” di panel Keamanan dihapus, dan route kemampuan ubah kata sandi baru sekarang memicu toast peringatan saat settings dimuat jika provider auth aktif tidak mendukung ubah kata sandi.

## Changed Files/Components

- `src/gateways/auth/bootstrap.ts` (registrasi section settings, route kemampuan reset/ubah kata sandi, pengikatan provider pada token)
- `src/gateways/auth/gateway.ts` (kontrak dukungan reset adapter dan orkestrasi gateway)
- `src/gateways/auth/access-tokens.ts`, `src/gateways/auth/guard.ts` (claim token terikat provider)
- `src/gateways/auth/ui/security-prefs.js` dan `src/gateways/auth/ui/languages/*/strings.xml` (pembersihan UI keamanan dan toast peringatan saat provider tidak mendukung)
- `src/adapters/auth/local/*`, `src/adapters/auth/ldap/*`, `src/adapters/auth/oidc/*`, `src/adapters/auth/saml/*` (kematangan adapter dan kemampuan baru)
- `src/gateways/auth/tests/*` dan `src/adapters/auth/*/tests/*` (pembaruan cakupan tes)
- Manifest versi dan `src/docs/versions.*.md`
- `src/ui/app/settings/index.js` (ekstensi i18n settings section untuk string komponen)

## Commit Links

- [a33f0fa](https://github.com/Cognis-Labs-HQ/Cognis/commit/a33f0faa)
- [9490a01](https://github.com/Cognis-Labs-HQ/Cognis/commit/9490a011)
- [8ba1d8b](https://github.com/Cognis-Labs-HQ/Cognis/commit/8ba1d8b2)
