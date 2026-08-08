# Status Ketersediaan

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
