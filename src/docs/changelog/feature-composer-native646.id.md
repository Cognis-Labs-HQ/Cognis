# Aksi tata letak native

**Cabang Fitur:** feature-composer-native646

## Aksi tata letak native

Panel tata letak utama dan bersarang menggunakan kontrol native `button type="button"` untuk Selesai, Buang, dan Atur Ulang. Aksi ini tidak mengirim formulir yang membungkusnya atau melakukan navigasi. Pengiriman tata letak yang masih berlangsung menonaktifkannya melalui penguncian editor yang sudah ada; pengiriman yang gagal memulihkan kontrol untuk percobaan ulang secara eksplisit. Selesai tetap menyimpan dan menutup setelah konfirmasi, Buang memulihkan keadaan awal lokal tanpa menulis, dan Atur Ulang menyimpan tata letak bawaan sambil melanjutkan penyuntingan. Kelas aksi yang ada dan target tutorial ruang kerja `#composer-edit-toggle` tetap sama.

## Komit

- [7dcf289b56fe90332c57b27f21f108dbb63140f8](https://github.com/Cognis-Labs-HQ/Cognis/commit/7dcf289b56fe90332c57b27f21f108dbb63140f8)
- [45986f62b4584520efcf707b8d1b0c2610a880a8](https://github.com/Cognis-Labs-HQ/Cognis/commit/45986f62b4584520efcf707b8d1b0c2610a880a8)
- [f03db8184a93fb4f015aea9d8b09684e0361eb38](https://github.com/Cognis-Labs-HQ/Cognis/commit/f03db8184a93fb4f015aea9d8b09684e0361eb38)
