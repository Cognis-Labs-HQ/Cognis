# Klien browser Berbagi

Klien browser Berbagi memungkinkan modul mengambil profil tamu berbagi yang sedang terautentikasi melalui kontrak browser publik gateway Share.

## Contoh penggunaan

Impor `uiCtx`, wajibkan `share:uiClient`, lalu panggil `getGuestProfile()`. Periksa `Response` yang dikembalikan sebelum membaca payload JSON `{ data }`.

## Spesifikasi teknis

Klien memiliki `/api/v1/share/guest-profile`, mengembalikan `Response` asli, dan mengandalkan klien API host untuk autentikasi serta penanganan koneksi. Penyedianya hanya aktif bersama gateway Share, sehingga rute dependen harus mendeklarasikan `share:uiClient` ketika membutuhkannya saat pemasangan.
