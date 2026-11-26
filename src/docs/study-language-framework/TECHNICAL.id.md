# Referensi Teknis

Study menemukan deskriptor bahasa aktif dan menampilkan konten terdaftar melalui halaman belajar host.

## Antarmuka

Bootstrap Study menemukan kapabilitas `study:language:<code>` dari modul aktif. Deskriptor menyediakan `code`, `name`, `flag`, `version`, `moduleId` opsional, dan `childComponents`. Entri anak memuat `id`, `label` atau `labelKey`, `pageUrl`, skrip/gaya opsional, urutan, serta peran minimum.

## Konfigurasi

Pasang dan aktifkan paket eksternal melalui [Modul](/docs/modules/external/usage). Pendaftaran bahasa belajar merupakan pengaturan akun. Skema konten dan impor dimiliki [Library](/docs/adapters/study/library/technical); [Study](/docs/gateways/study/technical) memiliki navigasi serta siklus hidup penyedia.

## Perilaku

Sinkronisasi deskriptor mendaftarkan bahasa dan memperbarui rute anak saat penyedia berubah. Halaman Explore host tidak mewajibkan setiap bahasa memiliki halaman browser sendiri. Navigasi lapisan memakai slug yang dinyatakan lapisan. Penyedia memiliki data bahasa; klien host menangani penjelajahan, favorit, serta flow latihan bersama.

## Keamanan

Deskriptor bahasa tidak memberikan keanggotaan kelas atau akses konten. Visibilitas, referensi kanonis, mutasi terlindungi, dan hadiah latihan diperiksa adaptor pemilik. Penonaktifan menghapus ketersediaan; pekerjaan browser tertunda mengikuti sinyal halaman/penyedia.

## Referensi

- [src/gateways/study/bootstrap.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/gateways/study/bootstrap.ts)
- [src/gateways/study/gateway.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/gateways/study/gateway.ts)
- [src/adapters/study/library/contracts.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/study/library/contracts.ts)
