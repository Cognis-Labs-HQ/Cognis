# Tutorial Terpandu

Panduan ini menjelaskan tindakan yang tersedia dalam komponen ini.

## Gunakan Panduan

Kunjungi halaman di bawah untuk memulai panduan yang belum selesai. Gunakan ? di samping judul halaman untuk mengulang panduan yang selesai; Lewati mengakhiri pengulangan.

## Spesifikasi Teknis

| Halaman / bagian                       | Panduan              | Akses          |
| -------------------------------------- | -------------------- | -------------- |
| `/settings` · `#tfa-settings-panel`    | Keamanan Dua Faktor  | Pengguna masuk |
| `/administration` · `#tfa-enforcement` | Kewajiban Dua Faktor | Administrator  |

Panduan didaftarkan melalui kapabilitas publik `ui:tutorials` dengan definisi, katalog, target, dan sinyal masa hidup milik komponen. Halaman, bagian yang terlihat, dan persyaratan akses menentukan ketersediaan. Pelepasan komponen melepas panduannya. Penyajian dan penyelesaian bersama dijelaskan dalam [kontrak tutorial host](/docs/tutorials).

Kode pemulihan dijelaskan untuk masuk saat faktor kedua tidak tersedia. Panduan penerapan menyorot sakelar, bukan seluruh panel.

## Pengiriman tantangan berbatas waktu

Pada Email Code, “dalam antrean” berarti pengiriman belum selesai. Tunggu kode terbaru. Kirim ulang mengganti kode sebelumnya hanya setelah diterima; penolakan mempertahankannya. Setelah kegagalan pengiriman, kirim ulang secara eksplisit sebelum kedaluwarsa atau mulai login baru. Percobaan login berlaku lima menit dan penyiapan sepuluh menit. Pembatalan penyiapan hanya memengaruhi penyiapan tersebut. Melanjutkan login tidak mengirim email lagi atau memperpanjang tenggat.

## Umpan Balik Pengiriman Ulang

Saat permintaan ulang dari metode aktif selesai, layar masuk menampilkan hasilnya. Konfirmasi antrean atau pengiriman menjelaskan status pengiriman yang dilaporkan; respons valid tanpa konfirmasi hanya menunjukkan bahwa metode telah merespons. Hasil yang ditolak, tidak valid, atau terputus tidak membuktikan apakah pengiriman terjadi. Periksa apakah kode sudah diterima sebelum mencoba lagi. Jika upaya masuk kedaluwarsa, batalkan dan masuk kembali. Waktu tunggu tetap ditentukan server, permintaan yang belum selesai tetap terkunci, dan percobaan ulang atau email tidak dikirim otomatis.

Selama kirim ulang belum selesai, tindakan menampilkan “Meminta kode…” dan status sibuk. Tindakan tetap terkunci tanpa membuat tenggat baru atau mencoba ulang otomatis. Jika kirim ulang selesai saat pembatalan berlangsung lalu pembatalan gagal, formulir yang sama menyelaraskan hasil, kunci permintaan, dan tenggat yang diterbitkan. Waktu tunggu relatif dari server dihitung sejak respons diterima, sehingga menunggu pembatalan tidak memulainya lagi.
