# Pemulihan Kanal Modul

**Cabang Fitur:** feature-deleted-module-channel

## Menjaga Konsistensi Katalog

Penyegaran katalog mengikat manifes dan aset ke satu commit agar penghapusan cabang setelah penggabungan tidak memisahkan modul dari terjemahannya. Daftar kanal harus menyediakan ID commit heksadesimal lengkap sepanjang 40 atau 64 karakter; ID singkat ditolak sebelum konten katalog dibaca.

## Memulihkan Pilihan Terhapus

Kanal yang dihapus beralih ke cabang bawaan saat ini. Pilihan yang masih tersedia dan asal versi terpasang tetap dipertahankan. Pengambilan yang tidak lengkap atau tidak valid mempertahankan katalog lengkap sebelumnya untuk dicoba lagi. Kegagalan akses repositori privat tetap terlihat ketika pembacaan cabang, rilis, atau manifes ditolak; konten tersimpan dan kanal yang dipilih tetap dipertahankan.

## Commit

- https://github.com/Cognis-Labs-HQ/Cognis/commit/b76d7122ab5a0e5471a3247b4cf9d5e04bc2784f
- https://github.com/Cognis-Labs-HQ/Cognis/commit/745d3901c67962142b3e30a7de59922181fd0694
- https://github.com/Cognis-Labs-HQ/Cognis/commit/e63648cbd18664832c77552cc65adfed78d89caf
