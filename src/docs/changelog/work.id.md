# Namespace File Clients

## Namespace-bound file clients

Gateway file kini menyediakan `files:namespace`, kapabilitas `ctx` yang mengembalikan klien terikat komponen dan namespace sehingga operasi file rutin tidak lagi mengulang metadata namespace dan pemanggil di setiap titik panggilan.

## Share gateway controls

Gateway Share kini memiliki kontrol untuk izin baca/tulis, pengguna dalam aplikasi, grup/kelas, penerima email, tautan berpelindung kata sandi, kata sandi yang dibuat otomatis, pembaruan masa berlaku/izin yang dapat diedit, dan metadata watermark untuk berbagi hanya-baca. Jitsi Meet dan Nextcloud Whiteboard kini membuat, mencantumkan, dan menghapus berbagi melalui rute token generik gateway Share, bukan endpoint berbagi khusus modul.
