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

Kode sumber dan metadata paket: `src/adapters/registration/public/`.
