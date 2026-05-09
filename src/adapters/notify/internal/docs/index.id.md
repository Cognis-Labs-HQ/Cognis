# Adaptor Notifikasi Internal

## Ikhtisar

Adaptor Internal mengirimkan notifikasi langsung ke bel notifikasi dalam aplikasi di setiap halaman dasbor. Adaptor ini selalu aktif secara bawaan — setiap notifikasi yang dikirim melalui gateway akan masuk ke kotak masuk penerima tanpa perlu mengonfigurasi preferensi notifikasi. Adaptor menyimpan hingga 50 notifikasi per pengguna dalam memori; entri akan hilang saat server di-restart.

## Tanggung Jawab

- Menerima setiap notifikasi yang dikirim gateway notifikasi dan menempatkannya di kotak masuk dalam aplikasi penerima.
- Menyuntikkan tombol bel notifikasi ke antarmuka dasbor melalui plugin navbar — menonaktifkan adaptor akan menghilangkan bel sepenuhnya.
- Menampilkan lencana dengan jumlah notifikasi yang belum dibaca, diperbarui setiap 30 detik.
- Menyediakan panel dropdown untuk membaca, menutup, dan menandai notifikasi sebagai telah dibaca.

## Rute API

| Metode   | Path                                   | Deskripsi                           | Auth     |
| -------- | -------------------------------------- | ----------------------------------- | -------- |
| `GET`    | `/api/v1/notifications/inbox`          | Daftar notifikasi pengguna          | Pengguna |
| `GET`    | `/api/v1/notifications/inbox/count`    | Jumlah notifikasi yang belum dibaca | Pengguna |
| `PUT`    | `/api/v1/notifications/inbox/read`     | Tandai semua sebagai sudah dibaca   | Pengguna |
| `PUT`    | `/api/v1/notifications/inbox/:id/read` | Tandai satu notifikasi sudah dibaca | Pengguna |
| `DELETE` | `/api/v1/notifications/inbox/:id`      | Hapus satu notifikasi               | Pengguna |

## Konfigurasi

Adaptor ini tidak memiliki konfigurasi. Adaptor aktif selama gateway notify memuatnya (yaitu selalu, karena adaptor ditemukan secara otomatis). Untuk menonaktifkan adaptor, hapus atau ubah nama direktori adaptor — setelah itu bel notifikasi akan menghilang dari antarmuka.
