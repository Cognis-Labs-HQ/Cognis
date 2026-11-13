# Registrasi Publik

Registrasi publik membuat akun melalui penyedia registrasi yang aktif dan dapat membuat profilnya melalui kapabilitas yang diinjeksi.

## Contoh Penggunaan

Gunakan kapabilitas gateway untuk registrasi, bukan memanggil adapter dari komponen lain:

```js
const register = ctx.capabilities.require("registration:public:register");
const account = await register({ username, password, email, displayName });
```

## Spesifikasi Teknis

Adapter menerima username, password, serta email dan displayName opsional. Adapter memangkas spasi di awal dan akhir username serta displayName, menolak nama pengguna atau kata sandi kosong dengan username_and_password_required, dan memanggil penyimpanan akun dengan peran user. Hasilnya memuat username, enabled, dan role. Penyimpanan akun menangani persistensi dan meneruskan kegagalan. Jika createProfile tersedia, pembuatan profil ditunggu setelah akun dibuat. Adapter dinonaktifkan secara bawaan; gateway memeriksa kebijakan registrasi publik dan menolak registrasi yang dinonaktifkan. Email opsional termasuk dalam kontrak masukan tetapi tidak diteruskan ke operasi pendaftaran akun.
