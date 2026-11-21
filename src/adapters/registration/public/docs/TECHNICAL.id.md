# Referensi Teknis

Antarmuka publik dan aturan operasional Pendaftaran Publik.

## Antarmuka

Menyumbangkan penyedia `register` ke gerbang Pendaftaran. Menerima `username`, `password`, serta `email` dan `displayName` opsional; tidak menyediakan rute HTTP mandiri.

## Konfigurasi

Aktifkan Pendaftaran Publik melalui administrasi Pendaftaran hanya jika akun boleh dibuat tanpa token undangan.

## Perilaku

Penyedia memangkas nama pengguna dan nama tampilan, mewajibkan nama pengguna dan kata sandi, membuat akun lokal dengan peran `user`, lalu memanggil pembuat profil yang diinjeksi jika tersedia.

Adapter menerima username, password, serta email dan displayName opsional. Adapter memangkas spasi di awal dan akhir username serta displayName, menolak nama pengguna atau kata sandi kosong dengan username_and_password_required, dan memanggil penyimpanan akun dengan peran user. Hasilnya memuat username, enabled, dan role. Penyimpanan akun menangani persistensi dan meneruskan kegagalan. Jika createProfile tersedia, pembuatan profil ditunggu setelah akun dibuat. Adapter dinonaktifkan secara bawaan; gateway memeriksa kebijakan registrasi publik dan menolak registrasi yang dinonaktifkan. Email opsional termasuk dalam kontrak masukan tetapi tidak diteruskan ke operasi pendaftaran akun.

## Keamanan

Pemanggil tidak dapat meminta peran administratif melalui penyedia ini. Kebijakan pendaftaran dan kelanjutan identitas eksternal ditegakkan gerbang pemilik.

## Referensi

- [src/adapters/registration/public/manifest.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/registration/public/manifest.json)
- [src/adapters/registration/public/package.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/registration/public/package.json)
- [src/adapters/registration/public/index.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/registration/public/index.ts)
