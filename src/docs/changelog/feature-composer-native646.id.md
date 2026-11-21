# Aksi tata letak native

**Cabang Fitur:** feature-composer-native646

## Aksi tata letak native

Panel tata letak utama dan bersarang menggunakan kontrol native `button type="button"` untuk Selesai, Buang, dan Atur Ulang. Aksi ini tidak mengirim formulir yang membungkusnya atau melakukan navigasi. Pengiriman tata letak yang masih berlangsung menonaktifkannya melalui penguncian editor yang sudah ada; pengiriman yang gagal memulihkan kontrol untuk percobaan ulang secara eksplisit. Selesai tetap menyimpan dan menutup setelah konfirmasi, Buang memulihkan keadaan awal lokal tanpa menulis, dan Atur Ulang menyimpan tata letak bawaan sambil melanjutkan penyuntingan. Kelas aksi yang ada dan target tutorial ruang kerja `#composer-edit-toggle` tetap sama.

## Komit

- [eadda4b8f2ffdd8cdb9da3fc4205b3fb09524529](https://github.com/Cognis-Labs-HQ/Cognis/commit/eadda4b8f2ffdd8cdb9da3fc4205b3fb09524529)
- [9dc32536b63fe4a385001b74b52c8bc0a725784e](https://github.com/Cognis-Labs-HQ/Cognis/commit/9dc32536b63fe4a385001b74b52c8bc0a725784e)
