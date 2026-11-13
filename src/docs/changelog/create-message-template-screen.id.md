# Pesan: Bilah Sisi Templat

**Cabang Fitur:** copilot/create-message-template-screen

## Pengelolaan templat dipindahkan ke bilah sisi

Templat pesan kini dikelola langsung dari bilah sisi. Sebuah tombol berlabel di bagian atas bagian templat membuka popup buat/ubah yang terfokus, dan setiap templat yang tersimpan ditampilkan di daftar di bawahnya dengan tindakan gunakan, ubah, dan hapus.

## Popup disederhanakan hanya menampilkan editor

Popup templat kini hanya menampilkan formulir editor. Templat tidak lagi dipilih dari daftar di dalam popup; mengklik judul templat di bilah sisi langsung memuatnya ke dalam komposer.

## Label Buat dan Simpan pada tombol kirim popup

Tombol kirim popup kini menampilkan "Buat" saat menambahkan templat baru dan "Simpan" saat mengedit templat yang ada.

## Daftar obrolan dan templat bergulir secara independen

Daftar percakapan dan daftar templat masing-masing memiliki area gulir tersendiri sehingga banyaknya percakapan tidak pernah menyembunyikan bagian templat dari tampilan.

## Templat terisolasi per akun

Templat pesan yang disimpan kini terisolasi untuk akun yang membuatnya. Di perangkat bersama, mengganti akun hanya akan menampilkan templat milik akun tersebut, bukan milik sesi sebelumnya.

## Teks komposer dipertahankan saat tata letak dibangun ulang

Teks yang diketik di komposer pesan yang belum dikirim tidak lagi hilang ketika kompositor halaman membangun ulang kisi tata letak, seperti saat melewati titik putus kolom responsif.

## Komit

- [3cf607d](https://github.com/Cognis-Labs-HQ/Cognis/commit/3cf607d2e31db00d07bdc6e7a247b2e1795857c2)
