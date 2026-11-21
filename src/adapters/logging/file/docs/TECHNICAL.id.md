# Referensi Teknis

Antarmuka publik dan aturan operasional Log Berkas.

## Antarmuka

Komponen dikonfigurasi melalui gerbang pemiliknya, bukan layanan administrasi terpisah.

## Konfigurasi

`level` memakai tingkat yang didukung gerbang. `rotateMaxBytes` adalah angka positif terbatas, `rotateMaxFiles` bilangan bulat nonnegatif, dan `rotateCompress` nilai boolean.

## Perilaku

Adaptor menyediakan `fileLevel` serta pengaturan rotasi `maxBytes`, `maxFiles`, dan `compressRotated`. Gerbang Pencatatan memiliki penyimpanan dan rotasi berkas.

## Keamanan

Hanya administrator boleh mengubah konfigurasi pengiriman atau penyimpanan. Permintaan tetap mengikuti autentikasi dan izin sumber daya yang ditegakkan gerbang pemilik.

## Referensi

Kode sumber dan metadata paket: `src/adapters/logging/file/`.
