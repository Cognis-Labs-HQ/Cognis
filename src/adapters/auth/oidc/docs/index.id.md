# Adapter Autentikasi OIDC SSO

## Ikhtisar

Adapter OIDC mengautentikasi pengguna melalui introspeksi token OpenID Connect, memungkinkan single sign-on dengan penyedia OAuth2/OIDC yang kompatibel seperti Google, Microsoft Entra ID, Okta, atau instance Keycloak yang di-host sendiri.

## Tanggung Jawab

- Menerima kredensial `accessToken` dan mengintropeksinya menggunakan endpoint discovery penyedia.
- Memetakan peran token dari klaim `roles` ke flag `isAdmin` Cognis.
- Mengekspos antarmuka `AuthProviderAdapter` ke gateway autentikasi.

## Arsitektur

```ts
export interface OidcClient {
    introspect(accessToken: string): Promise<OidcTokenClaims | null>;
}
```

## Konfigurasi

Konfigurasi melalui `PUT /api/v1/gateways/auth/adapters/oidc/config` (hanya admin).

| Kunci          | Keterangan                                             | Diperlukan |
| -------------- | ------------------------------------------------------ | ---------- |
| `providerName` | Pengidentifikasi penyedia                              | Ya         |
| `clientId`     | ID klien OAuth2                                        | Ya         |
| `clientSecret` | Rahasia klien OAuth2                                   | Ya         |
| `discoveryUrl` | URL dokumen discovery OpenID Connect                   | Ya         |
| `adminRoles`   | Peran token yang memberikan akses admin (dipisah koma) | Tidak      |
