# Referensi Teknis

Antarmuka publik dan aturan operasional Pendaftaran Publik.

## Antarmuka

Menyumbangkan penyedia `register` ke gerbang Pendaftaran. Menerima `username`, `password`, serta `email` dan `displayName` opsional; tidak menyediakan rute HTTP mandiri.

## Konfigurasi

Aktifkan Pendaftaran Publik melalui administrasi Pendaftaran hanya jika akun boleh dibuat tanpa token undangan.

## Perilaku

Penyedia memangkas nama pengguna dan nama tampilan, mewajibkan nama pengguna dan kata sandi, membuat akun lokal dengan peran `user`, lalu memanggil pembuat profil yang diinjeksi jika tersedia.

## Keamanan

Pemanggil tidak dapat meminta peran administratif melalui penyedia ini. Kebijakan pendaftaran dan kelanjutan identitas eksternal ditegakkan gerbang pemilik.

## Referensi

- [src/adapters/registration/public/manifest.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/1dcd65eaa5b187007735ca3b527b797758aae884/src/adapters/registration/public/manifest.json)
- [src/adapters/registration/public/package.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/1dcd65eaa5b187007735ca3b527b797758aae884/src/adapters/registration/public/package.json)
- [src/adapters/registration/public/index.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/1dcd65eaa5b187007735ca3b527b797758aae884/src/adapters/registration/public/index.ts)
