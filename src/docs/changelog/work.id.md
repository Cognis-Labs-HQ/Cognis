# Pembaruan modul andal

## Pulihkan status modul

Penonaktifan sementara untuk pembaruan, pembaruan paksa, dan perubahan kanal rilis kini mempertahankan status aktif modul yang diperbarui beserta semua modul aktif yang bergantung secara wajib. Modul bergantung kembali aktif setelah pembaruan dalam proses, sedangkan mulai ulang server yang diwajibkan memulihkan status yang sama saat proses awal.

## Tipe manifes lengkap

Kontrak manifes modul kanonis kini mendeklarasikan dependensi eksternal wajib dan opsional sehingga pembuat modul TypeScript dan pemakai inti dapat menggunakan metadata dependensi tanpa konversi tipe yang tidak aman.
