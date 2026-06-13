# Perbaikan Ruang Kelas

## Muat gaya SPA kelas

Rute SPA ruang kelas sekarang memuat stylesheet workspace saat navigasi di dalam aplikasi, sehingga workspace papan tulis, jarak sidebar, tile chat, dan kontrol agenda tampil benar tanpa perlu muat ulang penuh.

## Stabilkan perpindahan workspace

Navigasi tile dan slideshow sekarang menjaga workspace aktif tetap pada urutan visual yang benar, mempertahankan tombol pengubah tata letak saat chat terbuka, menginisialisasi tampilan chat dan whiteboard secara konsisten, dan mengembalikan siswa ke tampilan kelas dengan toast saat guru keluar.

## Tingkatkan unggahan materi guru

Unggahan pustaka guru sekarang memakai jalur penyimpanan `teacher-materials/`, memakai SVG unggah bersama di pemilih file, tidak lagi membuka popup dua kali, dan memakai batas unggahan dokumen yang lebih besar untuk materi kelas.

## Pindahkan Kepemilikan Notepad ke Adapter Notepad

Logika API agenda kelas dan berkas notepad sekarang berada di adapter study/notepad, sementara adapter classes hanya menyediakan kapabilitas sumber daya kelas bersama. Adapter notepad kini menangani snapshot agenda, rute berkas catatan, dan pengaturan batas ukuran berkas maksimum lewat permukaan konfigurasi adapter study.

## Tambahkan Konfigurasi Admin Nextcloud Whiteboard

Modul Nextcloud Whiteboard sekarang menyediakan popup pengaturan Administration serta rute konfigurasi persisten di `/api/v1/modules/nextcloud-whiteboard/config`. URL, rahasia penandatanganan, dan masa berlaku token disimpan di database dan dipakai untuk pembuatan token embed saat runtime.
