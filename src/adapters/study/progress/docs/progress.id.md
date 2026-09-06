# Kemajuan Belajar

Adaptor Kemajuan mencatat peristiwa belajar yang tidak dapat diubah dan idempoten, lalu membentuk proyeksi yang dapat dibangun ulang. Setiap peristiwa memuat pelaku, identitas dan revisi konten kanonis, aktivitas, lingkup, hasil percobaan, petunjuk, durasi, status penyelesaian, dan metadata terbatas.

## Privasi dan otorisasi

Layanan memeriksa kepemilikan pelaku sebelum membaca atau menulis. Administrator dan pemilik dapat meninjau pelaku lain; operasi ruang kelas juga memerlukan kemampuan akses adaptor Kelas.

## Kapabilitas dan alur

`study:progress` menyediakan pencatatan, koreksi kompensasi, kueri, agregasi, dan pembangunan ulang. `study:progress:recordEvent` menyediakan tahap `authorize`, `validate`, `observe`, `persist`, dan `project`.

## API HTTP

Klien terautentikasi memakai `/api/v1/study/progress/events`, `/projections`, dan `/aggregate`; administrator dapat menjalankan `/rebuild`. Filter mencakup pelaku, skema, lapisan, bahasa, aktivitas, jalur minat, ruang kelas, peristiwa, dan rentang waktu. Koreksi selalu ditambahkan tanpa mengubah riwayat.
