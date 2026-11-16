# Tampilan Berbagai Perangkat

**Cabang Fitur:** feature-core-device-layouts

## Ruang Kerja Responsif

Panel Kalender sempit menampilkan agenda berisi setiap acara dan tanggal terpilih, dengan pemilih tampilan serta tanggal yang ringkas. Panel lebar mempertahankan kisi kalender. Kolom tanggal mencapai tanggal kosong tanpa menggulir satu bulan. Kalender bersama memakai presentasi yang sama dan menegakkan akses baca saja.

Pesan menyesuaikan utas dan kolom penulisan dengan area layar yang terlihat. Percakapan membuka daftar ruang pada ponsel dan tablet. Escape mengembalikan fokus, pemilihan menutup daftar, dan perubahan orientasi mempertahankan draf. Layar pendek menggulir ruang kerja yang dapat digunakan alih-alih memotong kontrol.

## Composer

Page composer menentukan presentasi. Setiap perender elemen menerima konteks tetap berisi `compact`, `layout`, `drawer`, dan `touch`. Pemilihan memakai lebar dalam kartu yang tersedia, termasuk perubahan akibat bilah samping atau tata letak bersarang. Gunakan `responsive: true` untuk markup berbeda saat presentasi berubah; elemen biasa yang menyimpan keadaan mempertahankan DOM. Gunakan `onResize(presentation)` untuk pembaruan geometri. Kode halaman tidak memerlukan kueri layar atau penangan perubahan ukuran sendiri.

Bilah alat desktop memakai kolom bersama yang dibatasi agar konten memperoleh ruang yang cukup. Kolom mengikuti ukuran teks pilihan; ponsel dan tablet memakai panel Composer.

Nilai `layout` bersama adalah `compact` (hingga 640px), `medium` (hingga 900px), dan `regular`, berdasarkan lebar dalam kartu. Tampilan padat seperti Kalender memakai agenda pada kedua presentasi terbatas.

Atribut gaya `data-composer-layout`, `data-composer-drawer`, dan `data-composer-touch` dikelola composer untuk tata letak dan masukan. Komposisi biasa maupun bersarang menerima konteks yang sama. Composer mengamati konten dan kartu, memulihkan nilai formulir, serta melepaskan pengamat dan penangan peristiwa saat halaman berakhir.

## Komit

- [f4f6d3a84](https://github.com/Cognis-Labs-HQ/Cognis/commit/f4f6d3a84b587d4eb169b5db76b850956544ad31)
