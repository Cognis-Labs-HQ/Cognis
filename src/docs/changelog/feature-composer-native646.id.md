# Aksi tata letak native

**Cabang Fitur:** feature-composer-native646

## Aksi tata letak native

Panel tata letak utama dan bersarang menggunakan kontrol native `button type="button"` untuk Selesai, Buang, dan Atur Ulang. Aksi ini tidak mengirim formulir yang membungkusnya atau melakukan navigasi. Pengiriman tata letak yang masih berlangsung menonaktifkannya melalui penguncian editor yang sudah ada; pengiriman yang gagal memulihkan kontrol untuk percobaan ulang secara eksplisit. Selesai tetap menyimpan dan menutup setelah konfirmasi, Buang memulihkan keadaan awal lokal tanpa menulis, dan Atur Ulang menyimpan tata letak bawaan sambil melanjutkan penyuntingan. Kelas aksi yang ada dan target tutorial ruang kerja `#composer-edit-toggle` tetap sama.

## Komit

- [42981c58ed2a2757cee977d79007c99937406674](https://github.com/Cognis-Labs-HQ/Cognis/commit/42981c58ed2a2757cee977d79007c99937406674)
- [5036b5e71fb80aa106468004edbd219a1f6ec111](https://github.com/Cognis-Labs-HQ/Cognis/commit/5036b5e71fb80aa106468004edbd219a1f6ec111)
