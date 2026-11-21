# Referensi Teknis

Antarmuka publik dan aturan operasional Berbagi dengan Orang.

## Antarmuka

Berbagi dengan Orang terintegrasi melalui gerbang pemilik; manifesnya mengidentifikasi komponen dan dependensi yang diperlukan.

## Konfigurasi

Konfigurasi disediakan melalui gerbang pemilik. Berbagi dengan Orang tidak menyatakan konfigurasi tambahan dalam manifesnya.

## Perilaku

### Contoh penggunaan

Memberikan sumber daya langsung kepada pengguna Cognis melalui gateway Share. Adapter memvalidasi penerima pengguna dan memiliki halaman Pengguna di dalam popup gateway.

### Spesifikasi teknis

Adaptor memvalidasi input penerima atau token khusus metode, mendelegasikan orkestrasi sumber daya bersama ke gateway Share, dan hanya aktif selama gateway pemilik serta siklus hidup adaptor diaktifkan.

Perilaku ini dijelaskan dalam [kontrak bersama](/docs/adapters/share/link/technical).

## Keamanan

Akses Berbagi dengan Orang diatur oleh pemanggil dan gerbang pemilik. Mengaktifkan komponen tidak menambah izin akun.

## Referensi

Kode sumber dan metadata paket: `src/adapters/share/user/`.
