# Referensi Teknis

Antarmuka publik dan aturan operasional Notifikasi Dalam Aplikasi.

## Antarmuka

createNotificationSender memakai penyimpanan aktif secara malas. bootstrapNotifyAdapter mendaftarkan pengirim selalu aktif, rute inbox, dan lonceng. Dengan db:executor, DatabaseInternalNotificationStore diinisialisasi; tanpa itu penyimpanan volatil diperingatkan.

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

## Keamanan

Rute notifikasi mengautentikasi penerima dan mengakses rekaman akunnya. Persistensi memerlukan DATA_ENCRYPTION_KEY; jaga kunci tetap stabil dan rahasia.

## Referensi

- [src/adapters/notify/internal/manifest.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/notify/internal/manifest.json)
- [src/adapters/notify/internal/package.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/notify/internal/package.json)
- [src/adapters/notify/internal/index.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/notify/internal/index.ts)
- [src/adapters/notify/internal/routes/index.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/notify/internal/routes/index.ts)
