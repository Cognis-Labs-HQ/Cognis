# Penggunaan

Prosedur praktis untuk Alat Baris Perintah.

## Prasyarat

Gunakan cognisctl terpasang dan token berizin untuk perintah terlindungi.

## Contoh

Jalankan `cognisctl system:health` dan `cognisctl component:list`, lalu baca bantuan perintah komponen sebelum mengubah keadaan.

```sh
cognisctl --help
```

Jalankan `cognisctl user:delete <username>`. Prompt nama pengguna interaktif tetap tersedia. Pemeriksaan awal yang gagal berhenti sebelum DELETE dikirim. Keberhasilan normal yang terkonfirmasi menampilkan ringkasan penghapusan yang sudah ada dan keluar dengan kode 0.

Jika akun dihapus tetapi pembersihan gagal, perintah melaporkan bahwa penghapusan telah terjadi dan pembersihan belum selesai. Jangan mengulangi penghapusan untuk memperbaiki sumber daya terkait; periksa kegagalan server dan prosedur pemulihan komponen. Penghapusan yang ditolak atau tidak pasti juga keluar dengan kode 1. Teks kegagalan ditulis ke stderr; tidak ada ringkasan keberhasilan di stdout.

## Hasil yang Diharapkan

Perintah menampilkan hasil server dan memeriksa izin akun yang sama dengan HTTP.

## Pemecahan Masalah

Periksa alamat server dan COGNIS_CLI_TOKEN_PATH. Simpan token dan kata sandi dalam konfigurasi terlindungi, bukan keluaran terminal bersama.
