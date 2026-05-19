# Adapter Autentikasi LDAP

## Ikhtisar

Adapter LDAP mengautentikasi pengguna terhadap server direktori LDAP, menjadikannya pilihan yang tepat untuk organisasi yang sudah mengelola identitas di Active Directory, OpenLDAP, atau layanan direktori serupa. Pengguna login dengan token akses LDAP; adapter mengikat ke direktori dengan akun layanan, mencari pengguna, dan memetakan keanggotaan grup ke peran admin Cognis.

## Tanggung Jawab

- Menerima kredensial `accessToken` dan mengautentikasinya terhadap server LDAP.
- Memetakan grup LDAP pengguna yang terautentikasi ke flag `isAdmin` Cognis.
- Mengekspos antarmuka `AuthProviderAdapter` ke gateway autentikasi.

## Arsitektur

`LdapAuthAdapter` di `src/adapters/auth/ldap/index.ts` mengimplementasikan `AuthProviderAdapter`.

```ts
export interface LdapClient {
    authenticate(accessToken: string): Promise<LdapIdentity | null>;
}
```

## Konfigurasi

Konfigurasi melalui `PUT /api/v1/gateways/auth/adapters/ldap/config` (hanya admin).

| Kunci          | Keterangan                                                    | Diperlukan |
| -------------- | ------------------------------------------------------------- | ---------- |
| `host`         | Hostname server LDAP                                          | Ya         |
| `port`         | Port server LDAP                                              | Ya         |
| `bindDn`       | Bind DN untuk akun layanan                                    | Ya         |
| `bindPassword` | Password untuk bind DN                                        | Ya         |
| `baseDn`       | Base DN untuk pencarian pengguna                              | Ya         |
| `adminGroups`  | Grup LDAP yang anggotanya mendapat peran admin (dipisah koma) | Tidak      |
