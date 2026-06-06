# Tautan Bagikan Kalender

## Banyak tautan kembali tersedia

Popup edit kalender sekarang menyimpan semua tautan bagikan yang dibuat alih-alih
hanya menampilkan hasil terbaru. Setiap entri dirender sebagai blok yang dapat
dilipat dengan nama tautan serta kolom salin CalDAV dan ICS terpisah agar banyak
feed tetap mudah dikelola.

## Tautan privat kini memakai frasa sandi

Bagian kalender privat sekarang membuat frasa sandi khusus untuk setiap tautan.
Popup menampilkan frasa sandi itu di samping URL ekspor, dan endpoint bagikan
menerimanya untuk akses CalDAV maupun ICS tanpa token bearer Cognis.

## Tautan bagikan kembali kedaluwarsa

Tautan yang dibuat kini kembali mengikuti masa berlaku yang dipilih dan berhenti
aktif setelah batas waktunya lewat. Kalender publik juga sekarang membuat URL
tautan bagikan tersendiri sehingga setiap entri dapat kedaluwarsa secara mandiri.

## Kartu pengguna berbagi mengikuti kontrol baru

Setiap entri pengguna berbagi sekarang menaruh kartu profil, pilihan izin, dan
pilihan kedaluwarsa pada baris yang sama dengan tombol tutup ringkas di pojok
kanan atas. Perubahan izin kini hanya mengirim field yang benar-benar berubah,
sehingga error bad request saat berpindah antara baca-saja dan baca/tulis hilang.

## Kalender berbagi kedaluwarsa langsung dibersihkan

Ketika bagikan kalender dihapus atau kedaluwarsa, kalender yang dibagikan langsung
hilang dari daftar kalender penerima saat mereka menyegarkan halaman. Handshake
dijalankan setiap kali penerima memuat kalender mereka dan menghapus entri yang
catatan berbaginya sudah tidak ada.

## Perubahan izin tetap tersimpan saat berbagi ulang

Menambahkan kembali pengguna yang sebelumnya dibagikan tidak lagi mengatur ulang
izin yang ditingkatkan ke baca-saja. Izin yang ada tetap dipertahankan sehingga
pemilik dapat mengundang ulang pengguna dengan aman tanpa kehilangan hak tulis
yang telah diberikan sebelumnya.

