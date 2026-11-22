# Penggunaan

Prosedur praktis untuk Pendaftaran Publik.

## Prasyarat

Administrator harus mengaktifkan pendaftaran publik secara eksplisit.

## Contoh

Isi nama pengguna dan kata sandi, opsional email serta nama tampilan, lalu kirim sesuai kebijakan.

Gunakan kapabilitas gateway untuk registrasi, bukan memanggil adapter dari komponen lain:

```js
const register = ctx.capabilities.require("registration:public:register");
const account = await register({ username, password, email, displayName });
```

## Hasil yang Diharapkan

Pengiriman valid membuat akun pengguna lokal dan tidak dapat meminta peran administrator.

## Pemecahan Masalah

Periksa kolom wajib, ketersediaan nama, dan kebijakan publik bila ditolak.
