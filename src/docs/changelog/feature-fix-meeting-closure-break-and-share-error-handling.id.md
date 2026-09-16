# Tetap Tampilkan Kesalahan Berbagi di Halaman Berbagi

**Cabang Fitur:** `feature-fix-meeting-closure-break-and-share-error-handling`

## Tampilkan Kesalahan Akses Berbagi, Bukan Sesi Kedaluwarsa

Kegagalan akses saat melihat konten rapat yang dibagikan kini ditangani oleh gateway Berbagi sebelum pemantau kedaluwarsa sesi akun merespons. Saat host menutup rapat atau sumber daya yang dibagikan tidak lagi tersedia, tamu melihat kesalahan berbagi yang sesuai dan tidak dialihkan oleh pemulihan sesi akun.

## Alihkan Berbagi Rapat yang Dihapus ke 404

Saat pembersihan rapat menghapus berbagi yang aktif, pemantau status berbagi kini berhenti melakukan polling dan mengarahkan tamu langsung ke halaman 404 publik tanpa mencoba menyelesaikan kembali berbagi yang telah dihapus.

## Commit

- [bdcaabbc](https://github.com/Cognis-Labs-HQ/Cognis/commit/bdcaabbc)
- [3210a324](https://github.com/Cognis-Labs-HQ/Cognis/commit/3210a324)
