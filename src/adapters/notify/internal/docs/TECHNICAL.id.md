# Referensi Teknis

Antarmuka publik dan aturan operasional Notifikasi Dalam Aplikasi.

## Antarmuka

createNotificationSender memakai penyimpanan aktif secara malas. bootstrapNotifyAdapter mendaftarkan pengirim selalu aktif, rute inbox, dan lonceng. Dengan db:executor, DbInternalNotificationStore diinisialisasi; tanpa itu penyimpanan volatil diperingatkan.

| Metode   | Path                            | Deskripsi                           | Auth     |
| -------- | ------------------------------- | ----------------------------------- | -------- |
| `GET`    | `/api/v1/notify/inbox`          | Daftar notifikasi pengguna          | Pengguna |
| `GET`    | `/api/v1/notify/inbox/count`    | Jumlah notifikasi yang belum dibaca | Pengguna |
| `PUT`    | `/api/v1/notify/inbox/read`     | Tandai semua sebagai sudah dibaca   | Pengguna |
| `PUT`    | `/api/v1/notify/inbox/:id/read` | Tandai satu notifikasi sudah dibaca | Pengguna |
| `DELETE` | `/api/v1/notify/inbox/:id`      | Hapus satu notifikasi               | Pengguna |
| `DELETE` | `/api/v1/notify/inbox`          | Hapus semua notifikasi pengguna     | Pengguna |

Plugin navigasi, gaya, terjemahan, dan ikon memakai direktori `/static/gateways/notify-internal/` yang terdaftar saat bootstrap. Aset lonceng dimiliki adapter ini dalam `ui/assets/`.

## Konfigurasi

Adaptor ini tidak memiliki konfigurasi. Adaptor aktif selama gateway notify memuatnya (yaitu selalu, karena adaptor ditemukan secara otomatis). Untuk menonaktifkan adaptor, hapus atau ubah nama direktori adaptor — setelah itu bel notifikasi akan menghilang dari antarmuka.

Produsen notifikasi dapat menandai entri sebagai berkelanjutan dan menyediakan deskriptor tombol tindakan berisi pengenal, label aksesibel, ikon SVG opsional, serta konsekuensi. Adaptor memvalidasi dan merender kontrak umum ini, lalu memancarkan pengenal terpilih beserta payload notifikasi; adaptor tidak menafsirkan domain produsen atau memanggil kapabilitas produsen.

Produsen dapat mengorelasikan notifikasi berkelanjutan dengan prompt UI lain. Peristiwa generik `cognis:notification-resolved` menghapus setiap notifikasi dengan pengenal korelasi yang sama tanpa membuat adaptor mengetahui produsennya.

Produsen dapat melampirkan peta `metadata.localizedText` berdasarkan locale dengan string `subject` dan `body`. Adaptor peramban internal memilih locale peramban pertama yang didukung dan memakai teks amplop asli jika tidak tersedia; adaptor tidak menafsirkan domain produsen.

## Perilaku

Kedua penyimpanan mempertahankan lima puluh notifikasi per penerima dan membuang yang tertua. Payload basis data terenkripsi bertahan dengan DATA_ENCRYPTION_KEY stabil. Tanpa DB data hilang saat restart; produksi menolak kunci hilang. Kunci pengembangan lokal proses tidak dapat mendekripsi data lama setelah restart. Penghapusan akun membersihkan inbox melalui pemilik data.

### Kontrak Pengiriman Bertipe

Pengiriman internal memperoleh eksekutor basis data terstruktur melalui ctx. Kontrak pencatatannya memakai tingkat keparahan bootstrap yang didukung. Enkripsi, otorisasi kotak masuk, dan pengiriman yang selalu aktif tidak berubah.

### Bukti penghapusan akun

Pada `deprovision-user` → `cleanup-dependencies`, komponen memperoleh `auth:deprovisionOutcome` versi 1 melalui `system:contracts` dan memanggil `deletedAccount(input, stageResults)` dengan objek asli dari pemanggilan tersebut. Hanya bukti milik Auth yang mengonfirmasi penghapusan tersimpan yang mengizinkan penghapusan notifikasi akun yang tersimpan. Hasil salinan, hasil penonaktifan/pengarsipan, serta bukti yang hilang atau tidak tersedia tidak mengizinkan pembersihan ini.

Perilaku bersama: [Auth](/docs/gateways/auth/technical).

Migrasi ini melindungi konsumen pembersihan bawaan. Sebelum mengaktifkan penghapusan akun dalam penerapan, perbarui atau nonaktifkan hook pembersihan eksternal yang masih memercayai hasil alur publik yang dapat diubah.

- Menampilkan lencana dengan jumlah notifikasi yang belum dibaca, diperbarui setiap 10 detik saat halaman terlihat dan 30 detik saat tersembunyi.

### Status dan pemulihan kotak masuk

Buka lonceng untuk membaca notifikasi. Coba lagi memuat ulang kotak masuk tanpa mengulangi permintaan penandaan dibaca atau penghapusan. Kegagalan pemuatan pertama tidak berarti kotak masuk kosong. Jika pembaruan gagal, baris, hasil pencarian, dan jumlah belum dibaca yang terakhir dikonfirmasi tetap tersedia. Perubahan yang ditolak dan yang belum dikonfirmasi memiliki pesan berbeda; perubahan yang belum dikonfirmasi mungkin sudah selesai. Perbarui sebelum mencoba perubahan lagi. Perubahan yang dikonfirmasi tetap terlihat meskipun pembaruan berikutnya gagal.

Bilah navigasi mengekspor `mountProvider(scopedUiCtx)` untuk pemuat penyedia publik. Adaptor mendaftarkan `notify:internal:readInbox` dan `notify:internal:mutateInbox`, masing-masing dengan tahap `request` dan `reconcile`. Hanya respons kotak masuk yang valid dan bukti konfirmasi sesuai kontrak rute saat ini yang memperbarui status dalam memori. Permintaan baca terbaru yang masih berlaku diutamakan; perubahan tertunda mencegah tindakan tumpang tindih dan menggantikan pembacaan lama. Setiap pembaruan yang diterima menyelaraskan isi, urutan, dan status dibaca, termasuk ID notifikasi yang tidak berubah. Permintaan tulis tidak pernah diulang otomatis.

Status dan hasil UI tertunda hanya berlaku untuk akun, token, halaman, dan penyedia saat ini. Keluar, pergantian akun, pemasangan halaman, dan pelepasan penyedia membatalkan hasil lama. Baris yang dilepas dan konfirmasi yang ditutup tidak dapat menjalankan tindakan kemudian. Pendaftaran pencarian, pendengar peristiwa, pengatur waktu, dan panel sementara dilepas bersama pemiliknya. Tidak ada cache kotak masuk permanen di peramban.

Tutorial ruang kerja tetap membuka `#notification-toggle` dan menjelaskan `.notification-panel`. Masa aktif sementara bersama menutup panel, termasuk saat pembacaan masih tertunda. Hapus tetap nonaktif untuk kotak masuk yang dikonfirmasi kosong; kotak masuk yang tidak tersedia menawarkan Coba lagi, bukan menyatakan kosong. Notifikasi berkelanjutan mempertahankan popup terpisah, tindakan, korelasi, dan perilaku kedaluwarsa. Kategori notifikasi dan preferensi pengiriman tidak ditentukan oleh perubahan ini.

Penyelesaian korelasi dari produsen dijalankan berurutan tanpa duplikasi dalam masa aktif pemilik saat ini. Proses menunggu perubahan pengguna yang tertunda dan pembacaan terbaru sebelum menghapus notifikasi yang cocok. Penghapusan yang belum dikonfirmasi tidak pernah diulang otomatis.

## Keamanan

Rute notifikasi mengautentikasi penerima dan mengakses rekaman akunnya. Persistensi memerlukan DATA_ENCRYPTION_KEY; jaga kunci tetap stabil dan rahasia.

## Referensi

- [src/adapters/notify/internal/manifest.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/notify/internal/manifest.json)
- [src/adapters/notify/internal/package.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/notify/internal/package.json)
- [src/adapters/notify/internal/index.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/notify/internal/index.ts)
- [src/adapters/notify/internal/routes/index.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/notify/internal/routes/index.ts)
