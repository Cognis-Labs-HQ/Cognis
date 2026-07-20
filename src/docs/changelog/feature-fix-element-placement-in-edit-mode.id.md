# Tata letak edit page composer yang stabil

## Mode edit memakai dimensi mode normal

Overlay edit page composer kini mengukur kolomnya dari dimensi bagian konten yang sama dengan mode normal, sementara tinggi baris tetap terikat pada ukuran baris mode normal. Elemen bermedia seperti iframe, gambar, video, audio, konten canvas, konten object/embed, dan elemen yang secara eksplisit dipertahankan diparkir lalu dilampirkan kembali saat composer dirender ulang, bukan dibuat ulang, sehingga jendela tertanam seperti meeting aktif tetap terjaga. Komponen tetap dapat keluar dengan `data-composer-preserve="false"` saat wrapper API-nya harus mengelola pemulihan sendiri.
