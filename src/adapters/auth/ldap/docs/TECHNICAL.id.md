# Referensi Teknis

Antarmuka publik dan aturan operasional Masuk LDAP.

## Antarmuka

`LdapClient.authenticate(username, password, options)` memberi `LdapIdentity | null`. Adapter membaca username/password dan authSourceId opsional, memilih server bernama, lalu mengembalikan provider, externalUserId, email, displayName, dan role. Implementasi bawaan ialah StandardLdapClient.

## Konfigurasi

Administrasi menyimpan `unify` dan `servers` bernama. Server siap perlu identifier, serverUrl, baseDn, bindDn, bindPassword, userAttribute, dan userFilter. userDn/groupDn, groupFilter, memberOf, serta nestedMemberOf mengatur pencarian; roleMappings memetakan grup. Penulisan kata sandi memerlukan writebackEnabled dan cakupan. Sumber terpadu mencoba server berikutnya saat koneksi gagal.

## Perilaku

### Uji koneksi

Endpoint uji adapter memvalidasi bind akun layanan yang dikonfigurasi sebelum penemuan direktori. Kredensial LDAP yang tidak valid dilaporkan sebagai penolakan DN bind atau kata sandi; kegagalan transportasi dan sertifikat memakai diagnosis aman yang terpisah. Galat penyedia terperinci hanya dicatat di log server.

Adapter LDAP tersimpan siap diaktifkan jika setiap server bernama memiliki URL server, DN dasar, DN bind, kata sandi bind, atribut nama pengguna, dan filter pengguna. Kesiapan dinilai oleh adapter agar konfigurasi multi-server bertingkat dan kata sandi yang disamarkan ditangani dengan benar.

Penggeser aktivasi di Administrasi tetap dinonaktifkan hingga setidaknya satu server LDAP dikonfigurasi.

Setelah verifikasi pengguna selesai, server ditambahkan ke konfigurasi tertunda dan aktivasi langsung tersedia. Aktivasi pada tahap tersebut menyimpan daftar server tertunda sebelum mengaktifkan adaptor. Menutup penyiapan setelah memulai server yang belum disimpan memerlukan konfirmasi pembuangan perubahan.

Memilih Simpan Pengaturan, termasuk dengan menekan Enter, sebelum menguji autentikasi pengguna secara manual akan menjalankan uji autentikasi yang sama secara otomatis. Jika autentikasi gagal, penyiapan kembali ke tahap koneksi agar kolom bind dapat diperbaiki.

Menghapus server terakhir yang dikonfigurasi akan membuka peringatan konfirmasi dan menonaktifkan adaptor LDAP setelah dikonfirmasi. Uji koneksi mengembalikan diagnosis khusus kolom untuk setiap kemungkinan penyebab yang dikenali dari respons LDAP. Formulir penyiapan menyoroti semua kolom yang dilaporkan alih-alih mengurangi kegagalan multikolom, seperti kredensial bind yang ditolak, menjadi satu masukan.

Ekstensi penyiapan mengambil semua teks yang terlihat oleh pengguna dari sumber daya bahasa adaptor. Autentikasi pengguna serta pembuatan atau pembaruan server yang berhasil dikonfirmasi melalui toast keberhasilan.

Adaptor mendeklarasikan `/static/adapters/auth/ldap/languages` sebagai basis sumber daya bahasanya. Administrasi menerima URL tersebut dalam metadata adaptor dan memperluas instans i18n sebelum mengimpor popup penyiapan.

Formulir koneksi dan kredensial LDAP meneruskan kunci pelokalan adaptor secara langsung ke penyusun formulir bersama. Upaya autentikasi tanpa kedua kredensial wajib menampilkan toast galat yang dilokalkan dan memfokuskan kolom tidak valid pertama.

Penghapusan sumber menjalankan alur `reconcile-auth-sources`. Alur ini mencabut sesi setiap akun yang terkait dengan sumber yang dihapus. Jika penyatuan sumber dinonaktifkan, akun pengguna dinonaktifkan sepenuhnya; jika diaktifkan, hanya identitas sumber yang dihapus dilepas agar sumber lain dapat mengautentikasi dan memperbarui akun yang dipertahankan.

Permintaan Uji dan Temukan yang berhasil menampilkan toast keberhasilan yang dilokalkan sebelum penyiapan beralih ke filter dan pemetaan peran.

## Keamanan

Kredensial direktori divalidasi klien LDAP terkonfigurasi. Akses administrator mengikuti pemetaan grup; lindungi kredensial bind dan validasi sertifikat TLS direktori.

## Referensi

- [src/adapters/auth/ldap/manifest.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/1dcd65eaa5b187007735ca3b527b797758aae884/src/adapters/auth/ldap/manifest.json)
- [src/adapters/auth/ldap/package.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/1dcd65eaa5b187007735ca3b527b797758aae884/src/adapters/auth/ldap/package.json)
- [src/adapters/auth/ldap/index.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/1dcd65eaa5b187007735ca3b527b797758aae884/src/adapters/auth/ldap/index.ts)
