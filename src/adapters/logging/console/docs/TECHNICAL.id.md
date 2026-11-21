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

- [src/adapters/logging/console/manifest.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/1dcd65eaa5b187007735ca3b527b797758aae884/src/adapters/logging/console/manifest.json)
- [src/adapters/logging/console/package.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/1dcd65eaa5b187007735ca3b527b797758aae884/src/adapters/logging/console/package.json)
- [src/adapters/logging/console/index.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/1dcd65eaa5b187007735ca3b527b797758aae884/src/adapters/logging/console/index.ts)
