# Pemulihan Kanal Modul

**Cabang Fitur:** feature-deleted-module-channel

## Menjaga Konsistensi Katalog

Penyegaran katalog mengikat manifes dan aset ke satu commit agar penghapusan cabang setelah penggabungan tidak memisahkan modul dari terjemahannya. Daftar kanal harus menyediakan ID commit heksadesimal lengkap sepanjang 40 atau 64 karakter; ID singkat ditolak sebelum konten katalog dibaca.

## Memulihkan Pilihan Terhapus

Kanal yang dihapus beralih ke cabang bawaan saat ini. Pilihan yang masih tersedia dan asal versi terpasang tetap dipertahankan. Pengambilan yang tidak lengkap atau tidak valid mempertahankan katalog lengkap sebelumnya untuk dicoba lagi. Kegagalan akses repositori privat tetap terlihat ketika pembacaan cabang, rilis, atau manifes ditolak; konten tersimpan dan kanal yang dipilih tetap dipertahankan.

## Commit

- [1218f77880f555ba45174a29d375c3bee5825622](https://github.com/Cognis-Labs-HQ/Cognis/commit/1218f77880f555ba45174a29d375c3bee5825622)
- [d43df50371d28231e72fcdfa41ba26b6c4b3fedf](https://github.com/Cognis-Labs-HQ/Cognis/commit/d43df50371d28231e72fcdfa41ba26b6c4b3fedf)
