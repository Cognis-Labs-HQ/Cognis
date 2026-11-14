# Tutorial Terpandu

Panduan ini menjelaskan tindakan yang tersedia dalam komponen ini.

## Gunakan Panduan

Kunjungi halaman di bawah untuk memulai panduan yang belum selesai. Gunakan ? di samping judul halaman untuk mengulang panduan yang selesai; Lewati mengakhiri pengulangan.

## Spesifikasi Teknis

| Halaman / bagian                           | Panduan       | Akses          |
| ------------------------------------------ | ------------- | -------------- |
| `/settings` · `#auth-security-reset-panel` | Keamanan Akun | Pengguna masuk |

Panduan didaftarkan melalui kapabilitas publik `ui:tutorials` dengan definisi, katalog, target, dan sinyal masa hidup milik komponen. Halaman, bagian yang terlihat, dan persyaratan akses menentukan ketersediaan. Pelepasan komponen melepas panduannya. Penyajian dan penyelesaian bersama dijelaskan dalam [kontrak tutorial host](/docs/tutorials).

## Pengiriman tantangan berbatas waktu

Pada Email Code, “dalam antrean” berarti pengiriman belum selesai. Tunggu kode terbaru. Kirim ulang mengganti kode sebelumnya hanya setelah diterima; penolakan mempertahankannya. Setelah kegagalan pengiriman, kirim ulang secara eksplisit sebelum kedaluwarsa atau mulai login baru. Percobaan login berlaku lima menit dan penyiapan sepuluh menit. Pembatalan penyiapan hanya memengaruhi penyiapan tersebut. Melanjutkan login tidak mengirim email lagi atau memperpanjang tenggat.

## Label Formulir Kata Sandi

Panduan Keamanan Akun menjelaskan cara membuka Ubah Kata Sandi jika didukung, memenuhi kebijakan yang ditampilkan, mengonfirmasi kata sandi baru yang sama, serta memilih Simpan atau Batal. Simpan yang berhasil mengeluarkan akun; Batal memungkinkan keputusan membuang perubahan. Dua target panduan dan identitas penyelesaian yang ada tetap sama.
