# Penggunaan

Prosedur praktis untuk Pendaftaran.

## Prasyarat

Pemilik mengatur kebijakan; penerbitan bergantung pada peran dan penyedia.

## Contoh

Tinjau kebijakan, terbitkan undangan yang diizinkan, lalu tukarkan dengan alamat tujuan; formulir publik hanya berlaku bila pendaftaran publik aktif.

Pemanggil pendaftaran publik memperoleh kapabilitas terdaftar. Hasilnya memuat username, enabled, dan peran dari penyedia:

```js
const register = ctx.capabilities.require("registration:public:register");
const account = await register({ username, password, email, displayName });
```

## Hasil yang Diharapkan

Pembuatan akun mengikuti penyedia dan kebijakan; kegagalan penyimpanan akun tidak memakai undangan.

## Pemecahan Masalah

Periksa kedaluwarsa, kecocokan alamat, dan batas penerbitan. Masuk eksternal tidak melewati otorisasi pendaftaran.
