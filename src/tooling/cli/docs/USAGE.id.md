# Penggunaan

Prosedur praktis untuk Alat Baris Perintah.

## Prasyarat

Gunakan cognisctl terpasang dan token berizin untuk perintah terlindungi.

## Contoh

Jalankan `cognisctl system:health` dan `cognisctl component:list`, lalu baca bantuan perintah komponen sebelum mengubah keadaan.

```sh
cognisctl --help
```

## Hasil yang Diharapkan

Perintah menampilkan hasil server dan memeriksa izin akun yang sama dengan HTTP.

## Pemecahan Masalah

Periksa alamat server dan COGNIS_CLI_TOKEN_PATH. Simpan token dan kata sandi dalam konfigurasi terlindungi, bukan keluaran terminal bersama.
