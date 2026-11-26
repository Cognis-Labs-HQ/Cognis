# Penggunaan

Prosedur praktis untuk Pemulihan Komponen.

## Prasyarat

Gunakan administrator berwenang dan cadangan sebelum mengubah kode terpasang.

## Contoh

Jalankan `cognisctl component:list`, periksa komponen dengan component:info, dan atasi masalah dependensi atau konfigurasi sebelum mencoba lagi.

```sh
cognisctl component:upgrade module study-language-en
cognisctl component:upgrade module --all -v
cognisctl -v component:info module study-language-en
cognisctl --version
```

```sh
cognisctl component:upgrade module analytics --force
cognisctl component:disable module analytics --force
```

## Hasil yang Diharapkan

Pemulihan berhasil mengembalikan registrasi; fitur tergantung tetap diblokir bila persyaratan belum terpenuhi.

## Pemecahan Masalah

Pakai operasi paksa hanya setelah memahami dampaknya. Kapabilitas tidak tersedia bukan izin melewati batas komponen.
