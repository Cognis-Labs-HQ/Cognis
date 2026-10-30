# Cakupan CLI Modul

**Cabang Fitur:** feature-expand-cli-commands-and-update-modules-to-components

## Perintah API modul ditambahkan

Menambahkan perintah Cognisctl untuk endpoint backend modul yang sebelumnya memerlukan panggilan HTTP langsung, termasuk tampilan aktivitas Analytics, administrasi Jitsi Meet, dan operasi Nextcloud Whiteboard.

## Bootstrap API untuk kontribusi health diperbaiki

Bootstrap API kini memakai health service yang sama dengan server sehingga komponen dapat mendaftarkan kontribusi health tanpa menggagalkan proses startup.

# Cakupan CLI

## Perintah operasional

CLI kini memiliki perintah untuk TFA, notifikasi, alamat email, undangan, kalender, bahasa belajar, percakapan pesan, dan berbagi agar administrator dapat menjangkau lebih banyak fungsi aplikasi dari `cognisctl`.

## Panduan interaktif

Perintah dengan payload kompleks dapat meminta nilai yang diperlukan saat tidak ada argumen yang diberikan, sehingga transaksi API terstruktur lebih mudah dikirim dengan benar.

# Cakupan CLI Komponen

## Penemuan CLI

CLI sekarang menemukan plugin perintah dari modul, gateway, dan adapter, termasuk titik masuk CLI yang dideklarasikan di manifest, serta menampilkan perintah dinamis dengan format keluaran bawaan.

## Operasi komponen

`component:list` sekarang melaporkan modul, gateway, dan adapter berdasarkan tipe komponen. Perintah impor GitHub kini menjadi `component:import`, dan kontrol konfigurasi modul, gateway, dan adapter tersedia melalui `component:config:get` dan `component:config:set`.

## Perapihan Kesehatan Komponen

Permukaan CLI redundan `gateway:*` dan `component:health` dihapus, kesehatan komponen tetap berada di `system:health`, kontrol CLI TFA dibatasi ke metode pengguna yang sudah dikonfigurasi serta operasi pemulihan dan enforcement, dan status kesehatan komponen ditampilkan di detail Administrasi.

## Target CLI Eksplisit

Token bootstrap CLI kini memakai subjek sistem, bukan identitas pengguna normal. Perintah TFA dan kalender yang membaca data milik pengguna mewajibkan username eksplisit agar `cognisctl` tidak membuat kalender default, catatan TFA, atau status lain yang terikat pengguna untuk dirinya sendiri.

## Cakupan CLI Administratif

Perintah plugin kalender, sosial, pesan, berbagi, dan notifikasi kini berfokus pada inspeksi dan pemeliharaan administratif. Mutasi alur pengguna seperti membuat acara kalender, mengubah berbagi kalender, mengirim pesan, menyetujui permintaan pesan, serta membuat atau menghapus post sosial dihapus dari `cognisctl`.

## Pemformatan Output CLI

Error API kini dirender melalui formatter bersama yang mudah dibaca dan menyorot status, kode, pesan, serta detail dari respons error standar. Perintah plugin yang ditemukan secara dinamis, termasuk files, analytics, dan Jitsi Meet, kini memakai ringkasan terstruktur dan tabel sebagai default, bukan JSON mentah.

## Konfigurasi Komponen Terpadu

Inspeksi rapat Jitsi Meet sekarang memakai `jitsi-meet:meetings`, dan perintah konfigurasi khusus modul digabung ke `component:config:get` dan `component:config:set` agar modul, gateway dengan endpoint konfigurasi, dan adapter memakai satu permukaan konfigurasi komponen.

## Inspeksi Whiteboard dan Rapat

`nextcloud-whiteboard:whiteboards` sekarang memakai daftar whiteboard tingkat administrator, bukan konteks pengguna yang membutuhkan profil, dan ringkasan Jitsi Meet aktif kini menampilkan jumlah peserta yang diundang secara terpisah dari peserta aktif.

## Filter CLI Komponen Nonaktif

Plugin CLI komponen sekarang memeriksa ketersediaan komponen sebelum mendaftarkan perintah, sehingga modul, gateway, dan adapter yang dinonaktifkan tidak muncul di bantuan atau pencarian perintah saat API melaporkannya nonaktif. Perintah redundan `social:users:search` telah dihapus.

## Komit

- [555964b](https://github.com/Cognis-Labs-HQ/Cognis/commit/555964b626fd72acf48154ab588e2b016f8affdd)
