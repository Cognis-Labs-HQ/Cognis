# Nextcloud Whiteboard

## Ikhtisar

Modul Nextcloud Whiteboard mengintegrasikan aplikasi papan tulis kolaboratif Nextcloud ke dalam ruang kelas Cognis. Ketika modul diaktifkan dan dikonfigurasi dengan instans Nextcloud, guru dapat membuka papan tulis di dalam ruang kelas dan siswa bergabung ke papan yang sama secara real-time. Integrasi ini menggunakan token JWT yang ditandatangani sehingga pengguna Cognis tidak memerlukan akun Nextcloud sendiri.

Modul ini menyumbangkan kemampuan `whiteboard:getEmbedUrl` dan `whiteboard:fetchBoardData` agar adaptor ruang kelas dapat membuka papan tulis tanpa mengimpor internal modul secara langsung.

## Tanggung Jawab

- Membuat token JWT berumur pendek untuk menyematkan papan Nextcloud Whiteboard dalam iframe.
- Mengekspos rute API untuk membuat, mengambil, dan mengonfigurasi papan papan tulis yang dilingkupkan ke ruang kelas.
- Menyediakan popup konfigurasi admin agar operator dapat menyediakan URL instans Nextcloud, rahasia aplikasi, dan nilai default papan.
- Mendaftarkan kemampuan `whiteboard:getEmbedUrl` dan `whiteboard:fetchBoardData` melalui `ctx`.

Tidak bertanggung jawab atas: penyimpanan konten papan (Nextcloud yang mengelola itu), pengelolaan pengguna atau izin Nextcloud, atau pemeriksaan keanggotaan ruang kelas.

## Konfigurasi

| Variabel                      | Nilai Bawaan  | Keterangan                                                                  |
| ----------------------------- | ------------- | --------------------------------------------------------------------------- |
| `NEXTCLOUD_URL`               | _(tidak ada)_ | URL dasar instans Nextcloud. Diperlukan agar sematan papan tulis berfungsi. |
| `NEXTCLOUD_WHITEBOARD_SECRET` | _(tidak ada)_ | Rahasia aplikasi bersama yang digunakan untuk menandatangani token JWT.     |

## Rute API

| Metode | Path                                              | Keterangan                           | Autentikasi |
| ------ | ------------------------------------------------- | ------------------------------------ | ----------- |
| `GET`  | `/api/v1/modules/nextcloud-whiteboard/config`     | Ambil konfigurasi admin saat ini     | Admin       |
| `PUT`  | `/api/v1/modules/nextcloud-whiteboard/config`     | Perbarui konfigurasi admin           | Admin       |
| `POST` | `/api/v1/modules/nextcloud-whiteboard/boards`     | Buat papan whiteboard baru           | Diperlukan  |
| `GET`  | `/api/v1/modules/nextcloud-whiteboard/boards/:id` | Ambil metadata papan dan URL sematan | Diperlukan  |
