# Referensi Teknis

Antarmuka publik dan aturan operasional Berbagi dengan Orang.

## Antarmuka

createShareAdapter mengembalikan metode user untuk akun. prepare memerlukan penerima; validateUnique menolak duplikasi. Halaman berbagi akun memerlukan masuk.

## Konfigurasi

Berikan recipients dan izin sumber daya melalui dialog Bagikan. Pengiriman akun memakai identitas Cognis, bukan koneksi pesan eksternal.

## Perilaku

### Spesifikasi teknis

Adaptor memvalidasi input penerima atau token khusus metode, mendelegasikan orkestrasi sumber daya bersama ke gateway Share, dan hanya aktif selama gateway pemilik serta siklus hidup adaptor diaktifkan.

Perilaku ini dijelaskan dalam [kontrak bersama](/docs/adapters/share/link/technical).

## Keamanan

Penerima harus berupa referensi akun eksplisit. Penerima kosong dan pemberian ganda ditolak; gateway Share memeriksa wewenang pengirim serta batas izin.

## Referensi

- [src/adapters/share/user/manifest.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/share/user/manifest.json)
- [src/adapters/share/user/package.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/share/user/package.json)
- [src/adapters/share/user/index.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/share/user/index.ts)
