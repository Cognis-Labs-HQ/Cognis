# Referensi Teknis

Antarmuka publik dan aturan operasional OpenID Connect.

## Antarmuka

authenticate(credentials) membaca `accessToken` dan memanggil `OidcClient.introspect`. `sub` mengenali akun; hasil memuat `provider`, `externalUserId`, opsional `email` dan `role`. Tanpa klien atau kredensial, hasilnya null.

## Konfigurasi

### Konfigurasi

Konfigurasi melalui `PUT /api/v1/gateways/auth/adapters/oidc/config` (hanya admin).

| Kunci          | Keterangan                                             | Diperlukan |
| -------------- | ------------------------------------------------------ | ---------- |
| `providerName` | Pengidentifikasi penyedia                              | Ya         |
| `clientId`     | ID klien OAuth2                                        | Ya         |
| `clientSecret` | Rahasia klien OAuth2                                   | Ya         |
| `discoveryUrl` | URL dokumen discovery OpenID Connect                   | Ya         |
| `adminRoles`   | Peran token yang memberikan akses admin (dipisah koma) | Tidak      |

Label konfigurasi dibaca melalui `stringsBaseUrl` dari sumber bahasa adapter ini.

`configure()` menerapkan `providerName` / `adminRoles`. Kolom koneksi lainnya adalah metadata skema; implementasi tidak membuat klien protokol darinya.

## Perilaku

Adapter OIDC bawaan tidak memiliki klien protokol terpasang. createAdapter() mengembalikan klien null; integrasi harus memasok klien tervalidasi melalui setClient(). Konfigurasi saja tidak mengaktifkan masuk.

## Keamanan

Hanya klaim hasil introspeksi menetapkan identitas. Subjek penyedia mengenali akun eksternal; adminRoles mengatur peningkatan peran. Jangan catat token atau clientSecret.

## Referensi

- [src/adapters/auth/oidc/manifest.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/1dcd65eaa5b187007735ca3b527b797758aae884/src/adapters/auth/oidc/manifest.json)
- [src/adapters/auth/oidc/package.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/1dcd65eaa5b187007735ca3b527b797758aae884/src/adapters/auth/oidc/package.json)
- [src/adapters/auth/oidc/index.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/1dcd65eaa5b187007735ca3b527b797758aae884/src/adapters/auth/oidc/index.ts)
