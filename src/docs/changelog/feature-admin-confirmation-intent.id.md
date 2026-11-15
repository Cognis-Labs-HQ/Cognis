# Keputusan Administrasi

**Cabang Fitur:** feature-admin-confirmation-intent

## Keputusan Administrasi

Dialog Nonaktifkan menempatkan Batal yang netral terlebih dahulu dan menandai Nonaktifkan sebagai tindakan berbahaya. Aktifkan tetap positif. Batal, tutup, dan Escape tidak mengubah status komponen. Kontrol yang sedang memproses tidak memulai operasi yang sama lagi. Meninggalkan tampilan komponen, mengganti halaman Administrasi, atau mengubah sesi membatalkan pekerjaan yang belum dikirim. Permintaan yang sudah dikirim tidak dapat dibatalkan kembali. Permintaan yang ditolak menghentikan perubahan dependennya. Jika hasilnya tidak pasti atau pembacaan gagal setelah perubahan diterima, kontrol tetap tidak tersedia hingga Administrasi dimuat ulang untuk membaca status terkini. Saat meninggalkan draf, Tetap bersifat netral dan Buang dan Lanjutkan bersifat destruktif; hanya pilihan kedua yang menghapus draf.

Keputusan komponen memerlukan pengenal yang valid dan status terkini yang jelas. Respons inventaris yang tidak valid tidak dapat mengizinkan urutan penonaktifan atau membuka kembali kontrol setelah perubahan diterima.

Adaptor yang dikunci secara individual tetap dikelola oleh gateway-nya. Tindakan gateway tidak mengirim perubahan individual untuk adaptor tersebut atau menawarkannya sebagai pilihan Aktifkan adaptor.

## Komit

- [cbeb8ddade3166c6f2831b5371bf354b4c6c8b1a](https://github.com/Cognis-Labs-HQ/Cognis/commit/cbeb8ddade3166c6f2831b5371bf354b4c6c8b1a)
- [da2f1f42738a2b3d61fa73a9624fb670557382ad](https://github.com/Cognis-Labs-HQ/Cognis/commit/da2f1f42738a2b3d61fa73a9624fb670557382ad)
- [40d08231edb4630d69d1178097a50b06f3f05fd9](https://github.com/Cognis-Labs-HQ/Cognis/commit/40d08231edb4630d69d1178097a50b06f3f05fd9)
- [5be1992292d6d641d75805fe58a48c5555cc7940](https://github.com/Cognis-Labs-HQ/Cognis/commit/5be1992292d6d641d75805fe58a48c5555cc7940)
- [cc01b0af6c503b4e1b54b4e0cc040d22363d1c89](https://github.com/Cognis-Labs-HQ/Cognis/commit/cc01b0af6c503b4e1b54b4e0cc040d22363d1c89)
- [a0dd4227a060dddb0c73d043e39dfb0cbe4e90ae](https://github.com/Cognis-Labs-HQ/Cognis/commit/a0dd4227a060dddb0c73d043e39dfb0cbe4e90ae)
