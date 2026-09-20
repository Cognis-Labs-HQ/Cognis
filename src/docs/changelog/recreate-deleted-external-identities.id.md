# Membuat Ulang Akun Eksternal yang Dihapus

**Cabang Fitur:** recreate-deleted-external-identities

## Pemulihan Setelah Autentikasi Berhasil

Identitas eksternal yang berhasil diautentikasi kini dapat membuat ulang akun berlingkup penyedianya yang telah dihapus. Cognis menghapus catatan penghapusan dalam transaksi yang sama dengan pemulihan akun, sedangkan autentikasi yang gagal tidak dapat menghapusnya.

## Commit

- [5282575c57d00af6665f5c2d4ae3a9e265b870da](https://github.com/Cognis-Labs-HQ/Cognis/commit/5282575c57d00af6665f5c2d4ae3a9e265b870da)
