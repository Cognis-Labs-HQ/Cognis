# Referensi Teknis

Antarmuka publik dan aturan operasional Log Konsol.

## Antarmuka

Komponen dikonfigurasi melalui gerbang pemiliknya, bukan layanan administrasi terpisah.

## Konfigurasi

`level` harus termasuk tingkat yang disediakan gerbang Pencatatan. `format` menerima `pretty` atau `json`.

## Perilaku

Nilai tervalidasi menjadi `consoleLevel` dan `consoleFormat` dalam konfigurasi pencatat. Adaptor bawaan ini terkunci; manifesnya tidak menawarkan penonaktifan mandiri.

## Keamanan

Hanya administrator boleh mengubah konfigurasi pengiriman atau penyimpanan. Permintaan tetap mengikuti autentikasi dan izin sumber daya yang ditegakkan gerbang pemilik.

## Referensi

Kode sumber dan metadata paket: `src/adapters/logging/console/`.
