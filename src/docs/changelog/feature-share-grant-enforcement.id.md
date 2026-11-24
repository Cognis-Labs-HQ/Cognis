# Berbagi dan Terjemahan

**Cabang Fitur:** feature-share-grant-enforcement

## Periksa kedaluwarsa saat akses

Berbagi langsung kepada pengguna tidak lagi memberi akses setelah kedaluwarsa, termasuk berbagi yang telah dibuka dengan kata sandi dan disimpan dalam riwayat. Nilai kedaluwarsa kosong tetap tanpa batas; nilai tidak kosong yang tidak valid menolak akses.

## Hormati pencabutan hak eksplisit

PATCH dengan `grantedCapabilities: []` menghapus semua kapabilitas yang diberikan. Tanpa bidang tersebut, hak tetap dipertahankan; larik tidak kosong menggantikannya. Pemeriksaan penerima, kata sandi, dan adaptor tetap berlaku. Akses Kalender yang dikirim dihapus saat izin baca dicabut. Permintaan dan ekspor token memeriksa izin saat ini meskipun rekonsiliasi pengiriman masih tertunda.

## Katalog Terjemahan

Katalog keyring memakai akar XML runtime sehingga URL berbagi tamu dapat membuat keyring sementara tanpa kegagalan terjemahan. Label yang hilang untuk kunci ruang, reaksi, rangkaian kalender, tindakan email, kontrol notifikasi, callback SSO, dan status Administrasi tersedia dalam empat bahasa. Pemeriksaan akar katalog dan referensi literal mencegah kelalaian yang sama di komponen lain.

## Sesi dan tata letak berbagi

Tautan terlindungi menggunakan satu dialog kata sandi dan keyring tamu untuk autentikasi berulang atau bersamaan. Resolusi tertunda dibatalkan saat navigasi atau identitas akun berubah. Halaman tamu melewati permintaan profil khusus akun. Aset popup Link diresolusikan di jalur adaptor. Renderer kalender berbagi menunggu stylesheet miliknya dan memisahkan judul, navigasi, serta konten yang dapat digulir pada ukuran ponsel, tablet, dan desktop.

## Konvensi dokumentasi

Topik inti memakai nama berkas INFO, USAGE, dan TECHNICAL dengan huruf besar serta akhiran bahasa, sambil mempertahankan URL dan tampilan berversi. Validasi menolak nama berkas dan jalur manifes dengan huruf kecil atau campuran. Tautan catatan perubahan menampilkan referensi commit ringkas dan mempertahankan SHA lengkap yang tidak berubah pada tujuan; label panjang yang ada diperbaiki pada catatan inti dan komponen.

## Navigasi periode kalender

Kalender berbagi mendukung penelusuran bulan, minggu, dan hari yang sama dengan kalender akun melalui satu pengikatan kontrol yang mengikuti siklus hidup halaman. Tanggal dan tampilan terpilih berubah bersama. Label nomor minggu tetap mendatar kecuali kolomnya sendiri sempit, terlepas dari lebar viewport.

Gunakan Hari Ini, Minggu Ini, Bulan Ini, atau Tahun Ini untuk kembali ke periode saat ini tanpa mengubah tampilan terpilih. Panah berpindah satu periode sesuai tampilan; kontrol ini juga tersedia pada kalender berbagi.

## Komit

- [37279a3](https://github.com/Cognis-Labs-HQ/Cognis/commit/37279a34a3891cca73dbc5cc5c85f3b00b2b2e8a)
- [5244359](https://github.com/Cognis-Labs-HQ/Cognis/commit/5244359630d1cdc12910d11cfb9d20e2c916fbf0)
- [d18f6f0](https://github.com/Cognis-Labs-HQ/Cognis/commit/d18f6f0a62926c095df90a4cd6c15f9484f287b4)
- [1f9c347](https://github.com/Cognis-Labs-HQ/Cognis/commit/1f9c347e1ba3f836f54add76ce83592d85513f3e)
- [ab2b8bb](https://github.com/Cognis-Labs-HQ/Cognis/commit/ab2b8bbb31f93dbc3c816ed2988ff01e4d585c58)
- [a7fe8ac](https://github.com/Cognis-Labs-HQ/Cognis/commit/a7fe8ac3730ec41b4cacc15166715ddbef76eab3)
- [915ed28](https://github.com/Cognis-Labs-HQ/Cognis/commit/915ed288e7efc3c2be5a471126793ab81400d018)
- [67775d4](https://github.com/Cognis-Labs-HQ/Cognis/commit/67775d47445dd7a6cd070645c7c39bd0ee10678a)
- [aace4dd](https://github.com/Cognis-Labs-HQ/Cognis/commit/aace4ddebf574a6bded9c525c017a0d862de855e)
