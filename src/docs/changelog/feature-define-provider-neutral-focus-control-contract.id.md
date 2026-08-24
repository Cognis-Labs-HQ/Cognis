# Kontrol Fokus netral penyedia

## Fokuskan permukaan kolaborasi yang dideklarasikan

Menambahkan kontrak manifes aman, alur bertahap, kontrol milik composer, dan siklus overlay tersinkron tanpa mengikat halaman ke penyedia.

## Fokuskan panel kolaboratif apa pun

Elemen composer yang dapat difokuskan kini menampilkan ikon layar penuh. Sesi fokus aktif dapat mengikuti penyaji atau langsung berpindah antara permukaan yang dideklarasikan seperti obrolan rapat dan papan tulis yang dibuat penyedia.

## Gambar-dalam-gambar rapat yang dapat dipindahkan

Penyedia fokus dapat mendeklarasikan mode gambar-dalam-gambar dengan panel rapat yang dapat diubah ukurannya dan dipindahkan sementara konten dasbor lain tetap tersedia.

## Navigasi utama yang stabil

Navigasi utama kini mempertahankan urutan yang ditetapkan aplikasi. Kontrol seret dan pengurutan khusus pengguna dihapus agar shell halaman tetap sederhana dan andal.

## Halaman komponen eksternal

Modul eksternal dapat secara eksplisit membuka halaman SPA yang memenuhi syarat. Komponen lain dapat memintanya berdasarkan UUID modul yang tidak berubah dan ID rute stabil tanpa mengimpor kode penyedia atau menebak path aset.

## Halaman bawaan memakai broker

Halaman dasbor Cognis dan Study kini menerbitkan deklarasi halaman komponen stabil yang dimiliki UUID, sehingga halaman bawaan dan eksternal menggunakan jalur permintaan dan Focus Control yang sama.

## String modul terautentikasi

Bundel string marketplace yang dilindungi kini menggunakan klien API terautentikasi. Dokumentasi modul juga menegaskan bahwa titik—bukan garis bawah atau tanda hubung—memisahkan kata dalam kunci pelokalan.

## Rekomendasi tetap mutakhir

Respons marketplace yang disimpan kini mempertahankan rekomendasi Cognis setelah halaman dimuat ulang. Halaman Modul juga melakukan polling Cognis setiap lima belas detik selama terpasang.

## Kartu modul yang seimbang

Kisi Modul kini menyediakan ruang lebih luas untuk setiap kartu dan menata tindakan siklus hidup dalam baris yang seimbang, sehingga kontrol tidak berhimpitan atau tumpang tindih pada lebar desktop yang umum.

## Navigasi tetap alfabetis

Entri navigasi dasbor diurutkan secara alfabetis setiap kali modul atau penyedia UI lain menambahkan entri, lalu panel navigasi ringkas digambar ulang mengikuti urutan terbaru.

## Jendela komponen bertarget

Penemuan halaman komponen tidak lagi memasang UI. Capability spawn yang eksplisit dan diaktifkan pengguna membuka jendela terlindung dari navigasi di dalam panggung milik pemanggil serta mengembalikan handle yang dapat dibuang dengan pembersihan otomatis saat dibatalkan dan sebelum setiap perpindahan rute SPA.

## Menu pengguna yang stabil

Shell Cognis kini merekonsiliasi kontribusi menu pengguna saat penyedia dimuat dan menghapus entri tujuan duplikat yang disebabkan oleh pembaruan halaman eksternal dan bilah navigasi secara bersamaan.

## Memvalidasi dan mempertahankan pemindaian repositori privat

Pengaturan sumber Marketplace kini mempertahankan pilihan pemindaian repositori privat setelah aplikasi dimulai ulang. Saat diaktifkan, Cognis memvalidasi bahwa PAT yang dikonfigurasi dapat melihat repositori privat dan membaca isinya sebelum menyimpan. Penyegaran katalog juga melaporkan kredensial yang hilang, penolakan akses repositori privat, dan penolakan akses isi tanpa membuang modul yang tersimpan dalam cache.
