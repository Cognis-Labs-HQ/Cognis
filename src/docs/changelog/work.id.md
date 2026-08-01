# Mempertahankan profil dan menstabilkan percakapan terenkripsi

## Pengaturan ulang gantungan kunci mempertahankan identitas sosial

Menghapus gantungan kunci tidak lagi menghapus keanggotaan ruang pesan. Tindakan sosial berbasis profil juga membuat ulang profil akun terautentikasi yang hilang sebelum digunakan, sehingga nama pelaku tidak kosong bagi akun yang terdampak pengaturan ulang destruktif sebelumnya.

## Percakapan langsung bersifat idempoten

Permintaan bersamaan untuk memulai percakapan langsung yang sama diserialkan dan memeriksa ulang ruang yang sudah ada, sehingga permintaan cepat atau bertumpuk tidak membuat ruang ganda.

## Pesan menunggu pemuatan kunci aktif

Resolusi kunci ruang yang berjalan bersamaan dikoordinasikan per ruang agar masuk melalui SPA tidak menampilkan status lama yang meminta pembukaan kunci saat gantungan kunci yang sudah terbuka sedang menyelesaikan kunci ruang yang sama.
