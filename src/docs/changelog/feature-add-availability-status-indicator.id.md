# Status Ketersediaan

**Feature Branch:** feature-add-availability-status-indicator

## Lihat ketersediaan sekilas

Avatar kini menampilkan status kosong, sibuk, atau sementara di bilah navigasi, pratinjau profil, pesan, dan rapat.

## Atur status secara manual

Acara kalender mengatur status saat dimulai atau dibuat pada rentang waktu saat ini. Setelah itu, acara aktif dapat dikesampingkan melalui menu profil.

## Kontrol ketersediaan di menu profil

Menu profil kini terbuka saat penunjuk diarahkan atau diklik dan tetap terlihat sampai pengguna mengeklik area lain. Baris pertamanya berupa daftar status tanpa bingkai dengan titik warna yang sesuai untuk Luang, Sibuk, dan Tentatif; garis luar saat diarahkan membuat setiap entri menu lebih mudah diikuti.

## Detail status tersedia di mana saja

Mengarahkan penunjuk ke lampu status avatar kini menampilkan statusnya. Komponen juga dapat meminta ketersediaan pengguna yang mempertimbangkan kalender melalui kapabilitas ctx.

## Opsi status tidak lagi menggeser menu

Saat pemilih status dibuka, pilihannya kini tampil di sebelah kiri menu profil sehingga tindakan profil di bawahnya tetap berada di tempatnya.

## Kontrol status kalender

Pengaturan Pengguna kini memiliki opsi Umum untuk mencegah acara kalender mengubah ketersediaan.

## Kehadiran tidak aktif dan status kalender yang dapat diperluas

Adapter profil kini mengubah lampu status pengguna saat ini menjadi abu-abu ketika pendeteksi kehadiran melaporkan ketidakaktifan dan langsung memulihkannya saat aktivitas berlanjut. Status Tidak aktif diterapkan otomatis dan tidak dapat dipilih secara manual. Status acara kalender diperoleh dari kapabilitas ctx adapter profil, dan acara bebas menggunakan latar transparan.

## Status bersama sesuai visibilitas

Halaman dan pratinjau profil kini menampilkan status pengguna lain sesuai visibilitas profilnya: komunitas dapat dilihat semua orang, teman hanya oleh pengikut, dan privat hanya oleh orang yang diikuti pengguna tersebut. Kehilangan fokus browser langsung melaporkan Tidak aktif, sesi aktif mengirim sinyal berkala, dan avatar pratinjau tetap membulat di bawah lampu status.

## Latar status kalender yang konsisten

Latar Sibuk, Luang, dan Tentatif kini diterapkan secara konsisten pada kartu acara di semua tampilan Kalender, daftar acara mendatang, ringkasan tertunda, serta ringkasan acara mendatang di Dasbor. Kartu Luang tetap transparan, sedangkan kartu Tentatif menggunakan latar bergaris tanpa mengubah bingkainya.

## Pembaruan status acara yang andal

Saat memperbarui status acara Kalender yang ada, nilai cadangan kini diambil dari acara tersebut dan tidak lagi merujuk status rute yang tidak tersedia. Dengan demikian, permintaan PATCH khusus status tidak lagi menghasilkan kesalahan server internal.

## Gaya Kalender hanya dimuat saat diperlukan

Gaya status Kalender kini dimuat melalui lembar gaya halaman Kalender atau permintaan Dasbor yang eksplisit. Halaman yang tidak terkait seperti Administrasi tidak lagi meminta CSS status Kalender melalui klien navigasi Kalender global.

## Latar status tetap saat diarahkan

Mengarahkan penunjuk ke kartu acara Kalender tidak lagi mengganti latar Sibuk, Luang, atau Tentatif. Acara Mendatang mempertahankan efek status di dalam kartu acara yang membulat, sedangkan umpan balik saat diarahkan dibatasi pada bingkainya.

## Kartu acara mendatang dan judul kalender yang ringkas

Acara Mendatang kini menerapkan latar status pada tombol acara berbatas, bukan pada wadah daftar yang terlalu besar, dan latar hover khusus status mengesampingkan hover bilah alat umum. Judul Kalender Saya kini menyediakan kolom khusus untuk tombol Baru sehingga kontrol tidak lagi bertumpuk.

## Hover hanya menyorot aksen acara

Latar status Kalender kini secara eksplisit mempertahankan diri dari latar hover tombol umum. Saat diarahkan, latar kartu dan bingkai luar tetap sama; hanya bilah vertikal berwarna kalender yang disorot.

## Pembaruan peserta yang andal

Permintaan PATCH acara Kalender kini dapat memperbarui daftar peserta lagi. Rute acara sekarang mengimpor fungsi normalisasi Kalender yang berwenang secara eksplisit, mencegah kesalahan server akibat fungsi yang hilang sekaligus mempertahankan kehadiran pemilik.

## Indikator status diperbarui setelah perubahan kalender

Pembaruan acara Kalender yang berhasil kini memanggil perender ketersediaan adapter profil melalui UI ctx. Perender menghapus cache ketersediaan dan langsung menggambar ulang lampu status pengguna yang terlihat tanpa memerlukan penyegaran halaman.

## Menu profil mengikuti status efektif

Penyegaran ketersediaan kini memberi tahu menu profil serta lampu avatar. Menu langsung memindahkan pilihan aktif ketika Kalender mengubah status efektif, sedangkan status Tidak aktif otomatis menghapus pilihan dari semua opsi yang dapat dipilih dan menampilkan ringkasan abu-abu.

## Ketersediaan mengikuti batas acara aktif

Membuat acara Kalender yang sudah aktif kini langsung menyegarkan ketersediaan. Halaman Kalender juga menjadwalkan penyegaran berbasis ctx pada waktu mulai dan berakhir acara, sehingga lampu status dan menu profil berubah tanpa memuat ulang halaman.

## Integrasi ketersediaan tetap andal

Kalender kini mengambil preferensi yang dimulai belakangan saat digunakan, memakai konteks UI untuk data acara Dasbor, dan mempertahankan perilaku acara bebas ketika Social dinonaktifkan. Sesi kehadiran kedaluwarsa dan dibatasi per akun agar memori server tidak bertambah tanpa batas.

## Ketersediaan tak diketahui bersifat netral

Indikator status kini berwarna abu-abu dengan label Tidak diketahui ketika ketersediaan tidak dapat dimuat, alih-alih keliru menunjukkan pengguna sedang luang sebelum visibilitas profil mengizinkan akses.

## Status yang terlihat tetap terkini

Ketersediaan pengguna lain kini diperbarui setiap sepuluh detik selama indikator mereka terlihat di pratinjau profil, rapat, papan tulis, dan permukaan lain. Hero Profil tidak lagi menumpuk lampu ketersediaan pada avatar sehingga lencana peran tidak terhalang.

## Keandalan integrasi ketersediaan

Kalender kini menangani penyimpanan preferensi yang tidak tersedia tanpa galat, klien UI-nya memiliki permintaan preferensi, indikator status pengguna sendiri tetap mutakhir, dan langganan kehadiran yang dapat digunakan kembali telah didokumentasikan sepenuhnya.

## Kontrol pembaruan status kalender yang jelas

Pembaruan Status Kalender kini menggunakan tombol geser yang aktif secara bawaan dan ditampilkan sebelum Zona Berbahaya, yang tetap menjadi bagian terakhir di pengaturan Umum.

## Pengaturan Umum yang berkelanjutan

Pembaruan Status Kalender kini tetap berada dalam kartu pengaturan Umum yang berkelanjutan, menggunakan tata letak judul dan tombol geser yang sama seperti Tampilkan Catatan Perubahan, serta berada tepat di atas Zona Berbahaya terakhir.

## Pengaturan status yang lebih jelas dan konsisten

Pembaruan Status Kalender kini memiliki jendela informasi yang menjelaskan pengaruh acara terhadap ketersediaan. Pengaturan Pengguna kini memakai struktur judul bagian, isi, jarak, dan ukuran yang sama dengan Administrasi.

## Kontribusi pengaturan terstruktur

Pengaturan Pengguna dan Administrasi kini menerima grup konten deklaratif untuk judul, subjudul, teks penjelasan, tombol, sakelar, dan pemisah. Halaman merender struktur tersebut, memisahkan grup kontribusi secara otomatis, mengamankan teks, dan menerapkan satu kumpulan kelas tata letak yang baku. Pengaturan status Kalender dan administrasi TFA kini memakai kontrak ini sebagai pengganti HTML mentah.

## Struktur Pengaturan yang lebih lembut dan lengkap

Pemisah konten terstruktur kini menggunakan warna dengan kontras lebih rendah. Seluruh kontribusi Keamanan, termasuk konten kata sandi, autentikasi dua faktor, dan kode pemulihan, kini mengikuti struktur bagian, judul, isi, subjudul, dan teks kanonis yang sama tanpa menyisakan markup judul lama.

## Tata letak Pengaturan yang seimbang

Pemisah Pengaturan kini memakai warna garis abu-abu redup dari tema dalam mode gelap maupun terang. Judul metode autentikasi dua faktor tidak lagi memiliki jarak berlebih, Kode Pemulihan memiliki pemisah yang semestinya, grup Tanggal & Waktu terpisah dengan jelas, Keyring memakai struktur bagian kanonis, dan tindakan sinkronisasi browser tidak lagi mengubah ukuran judul bahasa.

## Privasi ketersediaan dan integritas status

Ketersediaan kini menghormati pemblokiran profil sebelum menampilkan status langsung. Kalender mempertahankan status acara khusus yang disetujui capability setelah mulai ulang, dan versi runtime serta dependensi kini sesuai dengan manifes komponennya. Rute ketersediaan dan pengujian terisolasinya juga mengikuti persyaratan organisasi rute dan isolasi komponen.

## Avatar Pesan yang lebih bersih

Bilah samping Pesan, gambar percakapan aktif, dan avatar pengirim tidak lagi menampilkan lampu ketersediaan. Tautan profil tetap dipertahankan.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/9ab0e629254a98caae0c359d1dfeb103d094d3e5
