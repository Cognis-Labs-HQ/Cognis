# Kontrak Registrasi

Gateway registrasi mengelola pendaftaran publik dan penukaran undangan serta menyediakan operasi penyedia melalui kapabilitas dan rute gateway.

## Contoh Penggunaan

Pemanggil pendaftaran publik memperoleh kapabilitas terdaftar. Hasilnya memuat username, enabled, dan peran dari penyedia:

```js
const register = ctx.capabilities.require("registration:public:register");
const account = await register({ username, password, email, displayName });
```

## Spesifikasi Teknis

Penukaran undangan menggunakan POST /api/v1/registration/redeem dengan objek JSON berisi token, username, password, serta email dan displayName opsional. Gateway meneruskan seluruh masukan ke penyedia undangan. Penyedia tersebut menangani validasi token, pembuatan akun, dan penyimpanan penukaran; kegagalannya diteruskan ke penanganan kesalahan rute. Registrasi publik menggunakan registration:public:isEnabled untuk ketersediaan dan registration:public:register untuk eksekusi. Gateway yang dinonaktifkan menolak eksekusi dengan gateway_disabled; penyedia publik yang tidak tersedia menolaknya dengan public_disabled. Ketersediaan diperiksa saat eksekusi. Bootstrap mendaftarkan kapabilitas tersebut dan memperluas alur gateAccountCreation serta constructRegistrationUi yang ada melalui ctx. Pemanggil menggunakan antarmuka ini alih-alih mengimpor adapter konkret.
