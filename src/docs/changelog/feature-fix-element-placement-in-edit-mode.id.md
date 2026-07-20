# Tata letak edit page composer yang stabil

## Mode edit memakai dimensi mode normal

Overlay edit page composer kini mengukur kolomnya dari dimensi bagian konten yang sama dengan mode normal, sementara tinggi baris tetap terikat pada ukuran baris mode normal. Elemen bermedia seperti gambar, embed, konten canvas, dan iframe meeting kini diparkir lalu dilampirkan kembali saat composer dirender ulang, bukan dibuat ulang, sehingga reload yang mengganggu tidak terjadi saat mode edit dinyalakan, elemen dipindahkan, popup muncul, atau notifikasi masuk.
