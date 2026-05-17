# Adapter SSO SAML

## Ikhtisar

Adapter SAML mengautentikasi pengguna melalui assertion SAML 2.0 dari penyedia identitas eksternal, memungkinkan single sign-on dengan sistem identitas enterprise seperti Microsoft AD FS, Google Workspace, Okta, atau IdP SAML 2.0 lainnya.

## Tanggung Jawab

- Menerima respons/assertion SAML, memvalidasinya dengan `SamlClient` yang dikonfigurasi, dan mengekstrak klaim identitas.
- Memetakan atribut SAML yang dapat dikonfigurasi ke flag `isAdmin` Cognis.
- Mengekspos antarmuka `AuthProviderAdapter` ke gateway autentikasi.

## Arsitektur

```ts
export interface SamlClient {
    validateAssertion(samlResponse: string): Promise<SamlAssertion | null>;
}
```

## Konfigurasi

Konfigurasi melalui `PUT /api/v1/gateways/auth/adapters/saml/config` (hanya admin).

| Kunci            | Keterangan                                        | Diperlukan |
| ---------------- | ------------------------------------------------- | ---------- |
| `entryPoint`     | URL SSO IdP SAML                                  | Ya         |
| `issuer`         | ID entitas Service Provider                       | Ya         |
| `certificate`    | Sertifikat penandatanganan X.509 IdP (format PEM) | Ya         |
| `adminAttribute` | Nama atribut SAML untuk pemeriksaan admin         | Tidak      |
| `adminValue`     | Nilai atribut yang memberikan akses admin         | Tidak      |
