# Tutorial Terpandu

## Gunakan Panduan

Di Explore, pilih Ikhtisar Study dari ? di samping judul halaman. Panduan manual ini menjelaskan navigasi, bahasa pilihan, pencarian kamus yang tersedia, dan pengaturan Study. Panduan tetap berada pada lapisan saat ini dan melewati kontrol yang tidak tersedia. Panduan milik bahasa menjelaskan konten dan hanya berlaku untuk bahasanya sendiri.

## Spesifikasi Teknis

| Halaman / Permukaan                 | Panduan          | Akses          |
| ----------------------------------- | ---------------- | -------------- |
| `/study/explore/*`                  | Ikhtisar Study   | Pengguna masuk |
| `/study/settings`, `/study/welcome` | Preferensi Study | Pengguna masuk |

## Ikhtisar Dan Panduan Bahasa

Ikhtisar mempertahankan identitas penyelesaian `study:getting-started`. Gunakan Berikutnya, Kembali, atau Mulai Ulang untuk meninjau navigasi tanpa berpindah halaman. Panduan yang selesai dapat diputar ulang dari menu ? yang sama. Panduan bahasa dapat dimulai otomatis pada konten bahasanya sendiri yang diikuti; mengganti bahasa pilihan menampilkan panduan bahasa tersebut.

`study:tutorialTargets` menyediakan target navigasi dan menggambar milik Study serta tindakan terbatas `route` dan `attachDrawing`. `matchesPage` hanya mencocokkan jalur Explore untuk bahasa yang diberikan. `isEnrolled(language)` membaca preferensi terverifikasi yang terikat akun melalui `study:navigation`. Penemuan panduan tidak berpindah halaman atau mendaftarkan bahasa. Library memiliki panduan kartu interaktif dan panduan umum penggantinya.

Target tutorial `modules` yang hanya digunakan direktori lama dihapus. Panduan eksternal harus menargetkan navigasi saat ini atau kontennya sendiri, bukan direktori yang telah dihapus.
