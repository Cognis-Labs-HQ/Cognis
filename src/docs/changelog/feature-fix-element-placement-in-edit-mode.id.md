# Tata letak edit page composer yang stabil

## Mode edit memakai dimensi mode normal

Overlay edit page composer kini mengukur kolomnya dari dimensi bagian konten yang sama dengan mode normal, sementara tinggi baris tetap terikat pada ukuran baris mode normal. Elemen bermedia seperti iframe, gambar, video, audio, konten canvas, konten object/embed, dan elemen yang secara eksplisit dipertahankan tetap berada di kartu yang sudah ada sementara kontrol edit dilapiskan di sekelilingnya, sehingga iframe tidak dipindahkan ulang dan jendela tertanam seperti meeting aktif tidak dipaksa memuat ulang. Komponen tetap dapat keluar dengan `data-composer-preserve="false"` saat wrapper API-nya harus mengelola pemulihan sendiri.

## Perlindungan penyegaran saat meeting

Meeting aktif kini mencegat pintasan keyboard untuk menyegarkan sebelum alur unload browser dimulai, lalu menampilkan pilihan di aplikasi untuk tetap berada dalam meeting atau sengaja menyegarkan dan keluar. Overlay pemuatan bersama kini menunggu `pagehide`, bukan `beforeunload`, sehingga membatalkan prompt penyegaran browser tidak meninggalkan halaman meeting dalam keadaan memuat.
