# Reset Kata Sandi Auth

## Summary

Ditambahkan alur reset kata sandi berbasis provider di Pengaturan Pengguna → Keamanan, termasuk route server yang mengevaluasi dukungan reset dari provider aktif dan menjalankan logika reset milik adapter.

Registrasi section Administration → Authentication dihapus agar kontrol provider autentikasi dikelola lewat permukaan konfigurasi adapter.

Adapter auth dimatangkan dengan kontrak kemampuan reset kata sandi dan pengaturan LDAP writeback opt-in melalui skema konfigurasi adapter.

## Changed Files/Components

- `src/gateways/auth/bootstrap.ts` (registrasi section settings, route reset kata sandi, pengikatan provider pada token)
- `src/gateways/auth/gateway.ts` (kontrak dukungan reset adapter dan orkestrasi gateway)
- `src/gateways/auth/access-tokens.ts`, `src/gateways/auth/guard.ts` (claim token terikat provider)
- `src/gateways/auth/ui/security-prefs.js` dan `src/gateways/auth/ui/languages/*/strings.xml` (UI keamanan baru di settings)
- `src/adapters/auth/local/*`, `src/adapters/auth/ldap/*`, `src/adapters/auth/oidc/*`, `src/adapters/auth/saml/*` (kematangan adapter dan kemampuan baru)
- `src/gateways/auth/tests/*` dan `src/adapters/auth/*/tests/*` (pembaruan cakupan tes)
- Manifest versi dan `src/docs/versions.*.md`

## Commit Links

- https://github.com/le-firehawk/Cognis/commit/5943c6b5689c6a4ddc9fde487bc128f45bd1be25
