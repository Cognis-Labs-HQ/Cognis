# Tata letak edit page composer yang stabil

## Mode edit memakai dimensi mode normal

Overlay edit page composer kini mengukur kolomnya dari dimensi bagian konten yang sama dengan mode normal, sementara tinggi baris tetap terikat pada ukuran baris mode normal. Elemen bermedia seperti gambar, video, audio, konten canvas, dan embed yang secara eksplisit ikut serta diparkir lalu dilampirkan kembali saat composer dirender ulang, bukan dibuat ulang, sementara iframe meeting yang dikelola API dikecualikan agar wrapper pemulihan dan kata sandinya tetap memegang kendali.
