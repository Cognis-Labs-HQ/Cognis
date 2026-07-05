# Nextcloud Whiteboard: Canvas Native WSS

## Canvas papan tulis native terhubung langsung ke server kolaborasi Nextcloud Whiteboard via WebSocket

Implementasi sebelumnya mengalihkan pengguna ke frontend milik Nextcloud. Papan tulis kini dibuka sebagai canvas native di jendela popup dan terhubung langsung ke server kolaborasi Nextcloud Whiteboard (Socket.IO / WSS) — tanpa iframe.

## Token sesi JWT diterbitkan di sisi server untuk koneksi klien yang aman

Saat pengguna membuka papan tulis, server Cognis menerbitkan JWT berumur pendek (ditandatangani dengan kunci API yang dikonfigurasi) dan mengirimkannya ke klien. Klien kemudian mengautentikasi diri ke server Nextcloud Whiteboard menggunakan token ini, menjaga kunci API tetap di sisi server.

## URL server kolaborasi terpisah di pengaturan admin

Admin kini mengonfigurasi **URL Server Papan Tulis** khusus yang mengarah ke endpoint server kolaborasi Nextcloud Whiteboard mandiri. Ini memisahkan URL instans Nextcloud dari alamat server Socket.IO dan mendukung konfigurasi port atau host apa pun.

## Halaman daftar papan tulis menampilkan tombol Buka per board

Setiap kartu board di halaman Whiteboards kini menampilkan tombol **Buka** yang meluncurkan canvas native di jendela popup.

## Kemampuan baru: `whiteboard:getEmbedUrl` dan `whiteboard:fetchBoardData`

Modul dan adapter lain kini dapat memperoleh URL embed atau metadata papan tulis melalui kemampuan publik ini, memungkinkan integrasi kelas dan rapat di masa mendatang.
