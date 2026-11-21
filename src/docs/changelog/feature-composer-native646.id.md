# Aksi tata letak native

**Cabang Fitur:** feature-composer-native646

## Aksi tata letak native

Panel tata letak utama dan bersarang menggunakan kontrol native `button type="button"` untuk Selesai, Buang, dan Atur Ulang. Aksi ini tidak mengirim formulir yang membungkusnya atau melakukan navigasi. Pengiriman tata letak yang masih berlangsung menonaktifkannya melalui penguncian editor yang sudah ada; pengiriman yang gagal memulihkan kontrol untuk percobaan ulang secara eksplisit. Selesai tetap menyimpan dan menutup setelah konfirmasi, Buang memulihkan keadaan awal lokal tanpa menulis, dan Atur Ulang menyimpan tata letak bawaan sambil melanjutkan penyuntingan. Kelas aksi yang ada dan target tutorial ruang kerja `#composer-edit-toggle` tetap sama.

## Komit

- [d458e6e3dd3e08a30fcd43be1c73b3e0eccc1dcc](https://github.com/Cognis-Labs-HQ/Cognis/commit/d458e6e3dd3e08a30fcd43be1c73b3e0eccc1dcc)
- [ab5b5e5a20216143ca0dc99d8b4ecd0bc45afef0](https://github.com/Cognis-Labs-HQ/Cognis/commit/ab5b5e5a20216143ca0dc99d8b4ecd0bc45afef0)
- [2d77508cffcb4eb46900f76d4f4174dba1799f7c](https://github.com/Cognis-Labs-HQ/Cognis/commit/2d77508cffcb4eb46900f76d4f4174dba1799f7c)
