# Keputusan Administrasi

**Cabang Fitur:** feature-admin-confirmation-intent

## Keputusan Administrasi

Dialog Nonaktifkan menempatkan Batal yang netral terlebih dahulu dan menandai Nonaktifkan sebagai tindakan berbahaya. Aktifkan tetap positif. Batal, tutup, dan Escape tidak mengubah status komponen. Kontrol yang sedang memproses tidak memulai operasi yang sama lagi. Meninggalkan tampilan komponen, mengganti halaman Administrasi, atau mengubah sesi membatalkan pekerjaan yang belum dikirim. Permintaan yang sudah dikirim tidak dapat dibatalkan kembali. Permintaan yang ditolak menghentikan perubahan dependennya. Jika hasilnya tidak pasti atau pembacaan gagal setelah perubahan diterima, kontrol tetap tidak tersedia hingga Administrasi dimuat ulang untuk membaca status terkini. Saat meninggalkan draf, Tetap bersifat netral dan Buang dan Lanjutkan bersifat destruktif; hanya pilihan kedua yang menghapus draf.

Keputusan komponen memerlukan pengenal yang valid dan status terkini yang jelas. Respons inventaris yang tidak valid tidak dapat mengizinkan urutan penonaktifan atau membuka kembali kontrol setelah perubahan diterima.

Adaptor yang dikunci secara individual tetap dikelola oleh gateway-nya. Tindakan gateway tidak mengirim perubahan individual untuk adaptor tersebut atau menawarkannya sebagai pilihan Aktifkan adaptor.

## Komit

- [8eb94e34f3747bcab037af29ae0e323650611fbd](https://github.com/Cognis-Labs-HQ/Cognis/commit/8eb94e34f3747bcab037af29ae0e323650611fbd)
- [d7172168d2beab6bbd86d6e689a65d27fdaafa00](https://github.com/Cognis-Labs-HQ/Cognis/commit/d7172168d2beab6bbd86d6e689a65d27fdaafa00)
