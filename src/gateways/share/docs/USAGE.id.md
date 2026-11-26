# Penggunaan

Prosedur praktis untuk Berbagi.

## Prasyarat

Konten harus mengizinkan berbagi dan metode terkait harus aktif.

## Contoh

Pilih Tautan atau Pengguna, periksa izin dan perlindungan, simpan, lalu uji sebagai penerima. Cabut berbagi lama setelah konfirmasi.

```sh
cognisctl share:tokens --help
cognisctl share:resolve --help
cognisctl share:recipients:users --help
cognisctl share:approvals:pending --help
```

Impor `uiCtx`, wajibkan `share:uiClient`, lalu panggil `getGuestProfile()`. Periksa `Response` yang dikembalikan sebelum membaca payload JSON `{ data }`.

## Hasil yang Diharapkan

Penerima hanya mendapat akses sumber daya yang dinyatakan; sesi tamu tidak menjadi sesi akun biasa.

## Pemecahan Masalah

Periksa kedaluwarsa, kata sandi, penerima, dan akses saat ini. Pencabutan menghentikan akses meski tautan lama masih terlihat.
