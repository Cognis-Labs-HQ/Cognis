# Referensi Teknis

Antarmuka publik dan aturan operasional Tautan Berbagi Publik.

## Antarmuka

createShareAdapter mengembalikan metode link, halaman publik, dan dialog. prepare mengosongkan penerima; Share memiliki token serta otorisasi.

## Konfigurasi

Setiap berbagi menyediakan accessControls, kedaluwarsa, dan kata sandi opsional. allowedPermissions membatasi dialog; adapter tidak mengatur akun pengiriman eksternal.

## Perilaku

### Adapter berbagi tautan

Adapter mendeklarasikan popup Link beserta kapabilitasnya melalui `navbarPlugins`. Gateway memuat kontribusi yang dideklarasikan dan menonaktifkannya bersama adapter pemilik.

### Spesifikasi teknis

Adaptor memvalidasi input penerima atau token khusus metode, mendelegasikan orkestrasi sumber daya bersama ke gateway Share, dan hanya aktif selama gateway pemilik serta siklus hidup adaptor diaktifkan.

Pemanggil dapat menetapkan `allowedPermissions: ["read"]` pada dialog berbagi untuk menampilkan hanya izin yang diterapkan sumber daya. Pilihan pengguna dan perubahan mengikuti daftar tersebut. Pemilik sumber daya tetap harus menegakkan izin yang sama pada alur otorisasi.

## Keamanan

Pemegang tautan hanya memperoleh cakupan sumber daya berizin. Kedaluwarsa, kata sandi, dan pencabutan diperiksa saat akses; batas pemanggil membatasi izin.

## Referensi

- [src/adapters/share/link/manifest.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/share/link/manifest.json)
- [src/adapters/share/link/package.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/share/link/package.json)
- [src/adapters/share/link/index.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/share/link/index.ts)
