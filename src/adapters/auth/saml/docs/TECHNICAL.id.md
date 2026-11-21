# Referensi Teknis

Antarmuka publik dan aturan operasional Masuk SAML.

## Antarmuka

authenticate(credentials) membaca `assertion` dan memanggil `SamlClient.consumeAssertion`. `nameId` mengenali akun; hasil memuat `provider`, `externalUserId`, opsional `email` dan `role`. Tanpa klien atau kredensial, hasilnya null.

## Konfigurasi

### Konfigurasi

Konfigurasi melalui `PUT /api/v1/gateways/auth/adapters/saml/config` (hanya admin).

| Kunci            | Keterangan                                        | Diperlukan |
| ---------------- | ------------------------------------------------- | ---------- |
| `entryPoint`     | URL SSO IdP SAML                                  | Ya         |
| `issuer`         | ID entitas Service Provider                       | Ya         |
| `certificate`    | Sertifikat penandatanganan X.509 IdP (format PEM) | Ya         |
| `adminAttribute` | Nama atribut SAML untuk pemeriksaan admin         | Tidak      |
| `adminValue`     | Nilai atribut yang memberikan akses admin         | Tidak      |

Label konfigurasi dibaca melalui `stringsBaseUrl` dari sumber bahasa adapter ini.

`configure()` menerapkan `adminAttribute` / `adminValue`. Kolom koneksi lainnya adalah metadata skema; implementasi tidak membuat klien protokol darinya.

## Perilaku

Adapter SAML bawaan tidak memiliki klien protokol terpasang. createAdapter() mengembalikan klien null; integrasi harus memasok klien tervalidasi melalui setClient(). Konfigurasi saja tidak mengaktifkan masuk.

## Keamanan

Autentikasi bergantung pada validator assertion dan sertifikat tepercaya. Petakan grup administrator secara sengaja; assertion belum divalidasi tidak boleh membentuk sesi.

## Referensi

- [src/adapters/auth/saml/manifest.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/1dcd65eaa5b187007735ca3b527b797758aae884/src/adapters/auth/saml/manifest.json)
- [src/adapters/auth/saml/package.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/1dcd65eaa5b187007735ca3b527b797758aae884/src/adapters/auth/saml/package.json)
- [src/adapters/auth/saml/index.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/1dcd65eaa5b187007735ca3b527b797758aae884/src/adapters/auth/saml/index.ts)
