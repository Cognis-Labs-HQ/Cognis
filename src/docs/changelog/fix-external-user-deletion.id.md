# Penghapusan Pengguna Tetap

**Cabang Fitur:** fix-external-user-deletion

## Penghapusan Eksternal Permanen

Penghapusan pengguna yang diautentikasi secara eksternal kini menyimpan sidik jari identitas satu arah sebelum akun dihapus. Autentikasi dan rekonsiliasi penyedia menolak sidik jari tersebut, sehingga sesi penyedia yang masih aktif tidak dapat membuat ulang pengguna yang telah dihapus secara diam-diam.

## Commit

- [69ba80376c9eee932299c8ae9f49f86819f77a0d](https://github.com/Cognis-Labs-HQ/Cognis/commit/69ba80376c9eee932299c8ae9f49f86819f77a0d)
- [dac7a3c55115a645ca04a63d7a336e88c69c7673](https://github.com/Cognis-Labs-HQ/Cognis/commit/dac7a3c55115a645ca04a63d7a336e88c69c7673)
