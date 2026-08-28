# Whiteboard di Dashboard

**Cabang Fitur:** feature-create-nextcloud-whiteboard-integration-module-yvnc2f

## Canvas kini tertanam langsung di dalam tata letak dashboard

Canvas papan tulis tidak lagi dibuka sebagai popup browser. Mengklik sebuah board dari daftar board memuat canvas gambar penuh secara inline di dalam dashboard, menjaga semua kolaborasi dalam satu tab.

## Pemeriksaan awal memverifikasi keterjangkauan server sebelum canvas diluncurkan

Sebelum canvas terhubung, pemeriksaan keterjangkauan server memastikan URL server papan tulis telah dikonfigurasi dan responsif. Pesan kesalahan yang jelas ditampilkan jika konfigurasi tidak ada atau server tidak dapat dijangkau.

## Alat gambar lengkap tetap tersedia di dalam dashboard

Canvas tertanam menyertakan toolbar lengkap — pena, penghapus, warna garis, lebar garis, dan hapus — sesuai dengan semua fitur yang sebelumnya tersedia di jendela popup.

## Kolaborasi real-time via Socket.IO tidak berubah

Koneksi Socket.IO dan sinkronisasi elemen tetap berjalan seperti sebelumnya; satu-satunya perubahan adalah canvas kini dipasang di dalam elemen grid page composer alih-alih jendela browser terpisah.

## Token sesi JWT diterbitkan di sisi server untuk koneksi klien yang aman

Saat pengguna membuka papan tulis, server Cognis menerbitkan JWT berumur pendek (ditandatangani dengan kunci API yang dikonfigurasi) dan mengirimkannya ke klien. Klien kemudian mengautentikasi diri ke server Nextcloud Whiteboard menggunakan token ini, menjaga kunci API tetap di sisi server.

## URL server kolaborasi terpisah di pengaturan admin

Admin mengonfigurasi **URL Server Papan Tulis** khusus yang mengarah ke endpoint server kolaborasi Nextcloud Whiteboard mandiri, memisahkan URL instans Nextcloud dari alamat server Socket.IO.

## Kemampuan baru: `whiteboard:getEmbedUrl` dan `whiteboard:fetchBoardData`

Modul dan adapter lain dapat memperoleh URL embed atau metadata papan tulis melalui kemampuan publik ini, memungkinkan integrasi kelas dan rapat di masa mendatang.

## Komit

- [3fba3a4](https://github.com/Cognis-Labs-HQ/Cognis/commit/3fba3a4ae030e1c17efc8f85e1245ceb69bc135d)
