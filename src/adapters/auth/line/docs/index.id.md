# Adapter SSO LINE Messenger

## Gambaran Umum

Adapter ini mengaktifkan LINE Login untuk autentikasi Cognis.

Adapter ini mendukung alur authorization code dengan PKCE agar pengguna mobile
yang memasang aplikasi LINE dapat menyelesaikan login melalui perpindahan ke
aplikasi LINE dan kembali ke redirect URI yang dikonfigurasi.

## Siklus hidup yang didukung

- Pembuatan akun awal dari identitas LINE saat login pertama berhasil.
- Sinkronisasi langsung display name dan metadata URL foto profil saat login.
- Propagasi status identitas `active`, `unlinked`, `deactivated`, dan `deleted`.
- Fallback lewat Registration Gateway saat registrasi publik dinonaktifkan:
  sistem membuat permintaan registrasi berstatus menunggu persetujuan admin
  sebelum akun dapat digunakan.

## Konfigurasi wajib

- `channelId`
- `redirectUri`

Opsional:

- `channelSecret`
- `usePkce`
- `accountIdPrefix`
- `tokenEndpoint`
- `profileEndpoint`
- `verifyIdTokenEndpoint`

## Setup LINE Console (channel + callback URL)

1. Buat channel **LINE Login** di LINE Developers Console dan hubungkan dengan
   provider Anda.
2. Buka pengaturan **LINE Login** untuk channel tersebut lalu aktifkan
   **Use LINE Login in your web app**.
3. Isi **Callback URL** dengan endpoint redirect Cognis untuk lingkungan ini
   (production/staging/local), lalu simpan.
4. Salin nilainya ke Cognis:
    - `channelId` = LINE **Channel ID**
    - `channelSecret` = LINE **Channel secret** (opsional jika flow hanya PKCE)
    - `redirectUri` = URL yang persis sama dengan LINE **Callback URL**
5. Di Cognis Administration → Authentication → LINE Messenger SSO → Configure,
   salin URL callback yang dikelola Cognis dari popup lalu simpan sebagai
   `redirectUri`, kecuali Anda membutuhkan callback publik yang berbeda.

## Tentang `redirectUri` (apakah generik?)

`redirectUri` tidak diambil dari LINE dan bukan nilai generik global. Nilai ini
adalah URL callback milik aplikasi Cognis Anda sendiri. Anda menentukan dan
meng-host nilainya, lalu memakai URL yang sama persis di dua tempat:

- LINE Console: **Callback URL**
- Konfigurasi adapter Cognis: `redirectUri`

Jika nilainya berbeda (termasuk path, trailing slash, atau protokol), pertukaran
authorization code dengan LINE akan gagal.

## Alur pemberitahuan pengguna untuk disclosure email LINE

Sebelum pengguna melanjutkan login LINE, Cognis menampilkan popup peringatan
tentang pengungkapan alamat email untuk memenuhi persyaratan LINE.

## Catatan implementasi mobile

Untuk alur web/native mobile, ikuti prosedur resmi LINE authorization code +
PKCE lalu kirim `authorizationCode` (dan `codeVerifier` saat PKCE dipakai) ke
`/api/v1/auth/login` dengan `provider: "line"`.

Referensi:

- https://developers.line.biz/en/docs/line-login/integrate-line-login/
- https://developers.line.biz/en/docs/line-login/getting-started/#channel-and-provider-linkage
- https://developers.line.biz/en/reference/line-login/#get-profile
- https://developers.line.biz/en/reference/line-login/#revoke-access-token
