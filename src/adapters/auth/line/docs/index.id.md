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

## Catatan implementasi mobile

Untuk alur web/native mobile, ikuti prosedur resmi LINE authorization code +
PKCE lalu kirim `authorizationCode` (dan `codeVerifier` saat PKCE dipakai) ke
`/api/v1/auth/login` dengan `provider: "line"`.

Referensi:

- https://developers.line.biz/en/docs/line-login/integrate-line-login/
- https://developers.line.biz/en/reference/line-login/#get-profile
- https://developers.line.biz/en/reference/line-login/#revoke-access-token
