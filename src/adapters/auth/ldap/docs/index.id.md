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

## Uji koneksi

Endpoint uji adapter memvalidasi bind akun layanan yang dikonfigurasi sebelum penemuan direktori. Kredensial LDAP yang tidak valid dilaporkan sebagai penolakan DN bind atau kata sandi; kegagalan transportasi dan sertifikat memakai diagnosis aman yang terpisah. Galat penyedia terperinci hanya dicatat di log server.

Adapter LDAP tersimpan siap diaktifkan jika setiap server bernama memiliki URL server, DN dasar, DN bind, kata sandi bind, atribut nama pengguna, dan filter pengguna. Kesiapan dinilai oleh adapter agar konfigurasi multi-server bertingkat dan kata sandi yang disamarkan ditangani dengan benar.

Penggeser aktivasi di Administrasi tetap dinonaktifkan hingga setidaknya satu server LDAP dikonfigurasi.

Setelah verifikasi pengguna selesai, server ditambahkan ke konfigurasi tertunda dan aktivasi langsung tersedia. Aktivasi pada tahap tersebut menyimpan daftar server tertunda sebelum mengaktifkan adaptor. Menutup penyiapan setelah memulai server yang belum disimpan memerlukan konfirmasi pembuangan perubahan.

Memilih Simpan Pengaturan, termasuk dengan menekan Enter, sebelum menguji autentikasi pengguna secara manual akan menjalankan uji autentikasi yang sama secara otomatis. Jika autentikasi gagal, penyiapan kembali ke tahap koneksi agar kolom bind dapat diperbaiki.

Menghapus server terakhir yang dikonfigurasi akan membuka peringatan konfirmasi dan menonaktifkan adaptor LDAP setelah dikonfirmasi. Uji koneksi mengembalikan diagnosis khusus kolom untuk setiap kemungkinan penyebab yang dikenali dari respons LDAP. Formulir penyiapan menyoroti semua kolom yang dilaporkan alih-alih mengurangi kegagalan multikolom, seperti kredensial bind yang ditolak, menjadi satu masukan.

Ekstensi penyiapan mengambil semua teks yang terlihat oleh pengguna dari sumber daya bahasa adaptor. Autentikasi pengguna serta pembuatan atau pembaruan server yang berhasil dikonfirmasi melalui toast keberhasilan.

Adaptor mendeklarasikan `/static/adapters/auth/ldap/languages` sebagai basis sumber daya bahasanya. Administrasi menerima URL tersebut dalam metadata adaptor dan memperluas instans i18n sebelum mengimpor popup penyiapan.
