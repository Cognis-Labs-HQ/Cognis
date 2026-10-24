# Kemajuan Belajar

Tipe bersama untuk peristiwa, pelaku, proyeksi, dan kapabilitas kemajuan berada di gateways/study/reuse/progress.ts. Gateway tidak lagi mengimpor titik masuk adaptor opsional untuk kontrak ini; adaptor tetap menerapkan kapabilitas dan ekspor publik yang sama. JSON peristiwa serta koreksi dibatasi 60.000 byte; permintaan lebih besar menghasilkan 413 sebelum pencatatan. Privasi, pemeriksaan kelas, koreksi, imbalan, dan alur pembangunan ulang tetap aktif.

Adaptor Kemajuan mencatat peristiwa belajar yang tidak dapat diubah dan idempoten, lalu membentuk proyeksi yang dapat dibangun ulang. Setiap peristiwa memuat pelaku, identitas dan revisi konten kanonis, aktivitas, lingkup, hasil percobaan, petunjuk, durasi, status penyelesaian, dan metadata terbatas.

## Penggunaan

```ts
const progress = ctx.capabilities.require("study:progress");
const events = await progress.listEvents(actor, {});
```

## Spesifikasi Teknis

### Privasi dan otorisasi

Layanan memeriksa kepemilikan pelaku sebelum membaca atau menulis. Administrator dan pemilik dapat meninjau pelaku lain; operasi ruang kelas juga memerlukan kemampuan akses adaptor Kelas. Kueri luas mengabaikan peristiwa ruang kelas ketika akses saat ini telah dicabut.

### Kapabilitas dan alur

`study:progress` menyediakan pencatatan, koreksi kompensasi, kueri, agregasi, dan pembangunan ulang. `study:progress:recordEvent` menyediakan tahap `authorize`, `validate`, `observe`, `persist`, dan `project`.

### API HTTP

Klien terautentikasi memakai `/api/v1/study/progress/events`, `/projections`, dan `/aggregate`; administrator dapat menjalankan `/rebuild`. Filter mencakup pelaku, skema, lapisan, bahasa, aktivitas, jalur minat, ruang kelas, peristiwa, dan rentang waktu. Koreksi selalu ditambahkan tanpa mengubah riwayat.

Klien terautentikasi mengirim koreksi ke `/api/v1/study/progress/events/corrections`; koreksi selalu ditambahkan tanpa mengubah riwayat. Kompensasi diselesaikan terhadap seluruh riwayat yang diizinkan sebelum filter dimensi atau waktu diterapkan. Peristiwa dan proyeksi disimpan secara persisten melalui gateway DB sehingga tetap tersedia setelah mulai ulang.

Endpoint peristiwa biasa menolak `compensatesEventId`; klien harus memakai endpoint koreksi agar otorisasi target dan validasi cakupan selalu dijalankan. Penyimpanan persisten memberlakukan satu koreksi per target secara atomik, termasuk ketika permintaan koreksi tiba bersamaan.

### Keamanan jadwal tinjauan

Interval tinjauan dibatasi hingga empat belas hari. Stempel waktu peristiwa hanya diterima jika seluruh interval tersebut tetap dapat direpresentasikan, sehingga peristiwa yang diterima tidak dapat menggagalkan pembangunan ulang proyeksi akibat tanggal tinjauan yang melampaui rentang tanggal yang didukung.

ID peristiwa stabil tetap berlaku setelah disimpan dan dibaca dari basis data. Pengiriman ulang peristiwa identik memperbaiki proyeksi yang terhenti tanpa menambah riwayat. Peristiwa kanonis mempertahankan isi, cakupan, waktu, petunjuk, ketepatan, penyelesaian dan referensi koreksi.

Pelajar terdaftar dapat mencatat hasil kelas sendiri dengan hak baca, tanpa hak menyunting kelas. Pencatatan untuk pelajar lain tetap memerlukan peran istimewa. Konteks kelas mengikuti keanggotaan terkini; berbagi dek saja tidak memberikan keanggotaan.

## Imbalan Latihan Tersimpan

ID proyeksi kemajuan memakai tupel identitas JSON yang tidak ambigu tanpa byte NUL yang ditolak kolom teks PostgreSQL. Hasil menggambar dan kartu belajar tepercaya memakai `study:progress:recordPractice` melalui tahap otorisasi, validasi, pencatatan peristiwa, dan imbalan. Impor peristiwa mentah tidak memberikan XP. `GET /api/v1/study/progress/engagement` yang terautentikasi mengembalikan ringkasan imbalan pelajar sendiri. Percobaan benar tanpa bantuan dapat memperoleh lencana latihan terlokalisasi. Koreksi membatalkan imbalan dan bukti peringkat terkait. Pengiriman ulang mempertahankan identitas peristiwa dan imbalan kanonis.
