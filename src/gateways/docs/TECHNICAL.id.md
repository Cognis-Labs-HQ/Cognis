# Referensi Teknis

Antarmuka publik dan aturan operasional Gerbang Fitur.

## Antarmuka

GatewayBootstrapContext menyediakan kapabilitas, rute, UI, dan siklus hidup. Helper bootstrap menjalankan defineContracts serta bootstrap adapter dalam cakupan pemilik.

## Konfigurasi

Host menyediakan root gateway dan adapter. Manifes menyatakan identitas, versi, dependensi, serta dokumentasi; kolom penyedia milik skema adapter terkait.

## Perilaku

Penemuan mendaftarkan pemilik dan penyedia aktif. Cakupan adapter memiliki kontrak, rute, serta callback; startup gagal membatalkan registrasi. Layanan fitur tetap dalam direktori gateway.

## Keamanan

Cakupan registrasi menentukan pemilik, bukan wewenang pengguna. Operasi tetap memeriksa autentikasi dan sumber daya; penyedia opsional tidak menerbitkan layanan privat pemilik lain.

## Referensi

- [src/gateways/package.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/gateways/package.json)
