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

## Popup pemilih kalender tidak lagi muncul untuk acara kalender berbagi

Menerima undangan acara yang sudah ada dalam kalender berbagi tidak lagi
membuka popup "Tambahkan Acara yang Diterima Ke". Respons langsung dicatat
di kalender berbagi yang bersangkutan.

## Menolak acara menghapus peserta secara permanen

Saat pengguna menolak acara (termasuk seluruh seri berulang lewat Respond All),
mereka dihapus dari daftar peserta semua kejadian yang terpengaruh. Acara tidak
akan muncul lagi di kalender atau daftar acara tertunda hingga penyelenggara
mengundang ulang secara eksplisit.

## Tombol Acara Tertunda cocok dengan gaya popup respons

Tombol respons cepat di bagian Acara Tertunda kini menggunakan gaya tombol
dengan garis tepi dan animasi hover yang sama seperti di event composer – hijau
untuk menerima, merah untuk menolak, dan netral berbingkai untuk tentatif.

## Acara Tertunda langsung diperbarui setelah respons dipilih

Mengeklik tombol respons cepat langsung menghapus item dari daftar tanpa
menunggu permintaan jaringan selesai.

## Acara mendatang tidak lagi menampilkan acara yang sudah berlalu

Undangan kalender yang tertunda untuk acara yang waktu berakhirnya sudah lewat
kini tidak lagi ditampilkan di daftar undangan. Sebelumnya, acara yang sudah
berlalu dengan respons tertunda masih bisa muncul di bagian mendatang.
