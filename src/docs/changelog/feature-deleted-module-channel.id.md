# Pemulihan Kanal Modul

**Cabang Fitur:** feature-deleted-module-channel

## Menjaga Konsistensi Katalog

Penyegaran katalog mengikat manifes dan aset ke satu commit agar penghapusan cabang setelah penggabungan tidak memisahkan modul dari terjemahannya. Daftar kanal harus menyediakan ID commit heksadesimal lengkap sepanjang 40 atau 64 karakter; ID singkat ditolak sebelum konten katalog dibaca.

## Memulihkan Pilihan Terhapus

Kanal yang dihapus beralih ke cabang bawaan saat ini. Pilihan yang masih tersedia dan asal versi terpasang tetap dipertahankan. Pengambilan yang tidak lengkap atau tidak valid mempertahankan katalog lengkap sebelumnya untuk dicoba lagi. Kegagalan akses repositori privat tetap terlihat ketika pembacaan cabang, rilis, atau manifes ditolak; konten tersimpan dan kanal yang dipilih tetap dipertahankan.

## Commit

- https://github.com/Cognis-Labs-HQ/Cognis/commit/7b5d27e196c7597948332a39196d7ca147f2098b
