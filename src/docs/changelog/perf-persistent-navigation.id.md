# Navigasi Tetap Terlihat

**Cabang Fitur:** perf-persistent-navigation

## Navigasi Tetap Terlihat

Pemuatan rute dan dokumen memakai lapisan seluruh jendela. Pesan pemuatan muncul di bawah indikator putar dengan penundaan tampilan yang sama, selama navigasi yang diterima menyiapkan penyedia, mengimpor halaman, memvalidasi sesi, dan memasang konten. Navigasi yang digantikan segera melepaskan tokennya. Penyelesaian dan kegagalan menghapus tampilan pemuatan melalui tampilan galat yang tersedia. Pembacaan terjemahan di latar belakang tidak mengubah bahasa yang dipilih.

Halaman yang masih terlihat mempertahankan gaya rutenya selama tujuan dimuat. Gaya tujuan disiapkan dalam keadaan tidak aktif dan diaktifkan saat konten diganti. Persiapan yang dibatalkan atau gagal hanya melepaskan gayanya sendiri. Kontrol bersama dan jendela komponen yang terbuka mempertahankan gaya miliknya hingga dibuang. Dokumen produksi menyimpan identitas sumber stylesheet agar pemuatan langsung dan navigasi SPA memakai kepemilikan yang sama.

Kepemilikan rute awal hanya mencakup gaya rute yang dideklarasikan atau gaya dokumen produksi dengan metadata sumber. Gaya yang disisipkan penyedia notifikasi dan penyedia persisten lainnya tetap dimiliki penyedia tersebut, sehingga pergantian rute tidak menghapus aturan ukuran ikon lonceng.

Setiap penyusunan antarmuka mengambil preferensi terkini satu kali untuk kontrol tema dan bahasa serta menjadwalkan satu pembaruan avatar setelah penyedia siap. Elemen avatar yang tidak berubah dipertahankan. Hasil terlambat ditolak setelah akun, token, penyedia, atau pembaruan berubah. Tidak ada cache respons pribadi baru.

## Komit

- [ab071e2](https://github.com/Cognis-Labs-HQ/Cognis/commit/ab071e280a6109d8d617e006fba9f2fe80419548)
- [efa41cb](https://github.com/Cognis-Labs-HQ/Cognis/commit/efa41cb9a5cdcc671d38888fa89bb6697fa30d03)
- [15ab62e](https://github.com/Cognis-Labs-HQ/Cognis/commit/15ab62e625481975126e11f43440311254825e01)
- [3459109](https://github.com/Cognis-Labs-HQ/Cognis/commit/3459109a8307b50c0510abff2fe17bdbdf162554)
- [9ae3c44](https://github.com/Cognis-Labs-HQ/Cognis/commit/9ae3c443e3f8318d54a8318660588f2d044e13bc)
