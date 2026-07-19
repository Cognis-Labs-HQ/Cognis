# Akses profil berdasarkan visibilitas

## Mengikuti memerlukan peminta yang terlihat

Pengguna kini harus mengatur visibilitas profilnya sendiri setidaknya ke privat sebelum dapat mengikuti profil lain, sehingga profil tersembunyi tidak dapat membuat relasi mengikuti baru.

## Profil tersembunyi memakai halaman 404

Saat sebuah profil tidak dapat dilihat karena aturan visibilitas menyembunyikannya dari pengguna saat ini, aplikasi profil kini mengarah ke halaman galat 404 standar alih-alih menampilkan pesan tidak ditemukan di dalam halaman.

## Permukaan galat mengikuti tema tersimpan

Halaman galat dan popup galat runtime kini menerapkan tema tersimpan sebelum dirender, sehingga pengguna tema terang melihat permukaan galat yang sesuai bahkan saat rute gagal lebih awal.

## Router melindungi akar navigasi galat

Router aplikasi kini memastikan akar dashboard sebelum memasang rute, sehingga navigasi dari profil ke halaman 404 tetap berfungsi meski terjadi sebelum shell dashboard menginisialisasi router.
