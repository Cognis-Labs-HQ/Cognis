# Menonaktifkan Aksi Hapus

**Cabang Fitur:** feature-disable-delete-notifications-button-when-empty

## Ringkasan

Kotak masuk notifikasi internal kini menonaktifkan tombol hapus semua yang bersifat destruktif ketika tidak ada notifikasi. Perubahan ini mencegah popup konfirmasi yang tidak perlu dan menjaga status aksi tetap selaras dengan isi kotak masuk.

## File / Komponen yang Diubah

- `src/adapters/notify/internal/ui/navbar-plugin.js` — Menjaga tombol hapus semua tetap nonaktif saat kotak masuk kosong dan menambahkan penjagaan pada jalur klik agar popup konfirmasi tidak terbuka ketika tidak ada notifikasi.
- `src/adapters/notify/internal/ui/notifications.css` — Mencegah gaya hover destruktif saat tombol hapus semua dalam keadaan nonaktif.
- `src/ui/tests/notification-followups.test.js` — Menambahkan cakupan runtime yang merender keadaan kotak masuk kosong dan memverifikasi jalur klik hapus semua tidak memanggil popup.
- `src/adapters/notify/internal/package.json` dan `src/docs/versions.en.md` — Menaikkan versi adapter Internal Notification menjadi `0.5.3`.

## Commit

- [96d6616](https://github.com/Cognis-Labs-HQ/Cognis/commit/96d6616)
