# Perbaikan Ruang Kelas

## Muat gaya SPA kelas

Rute SPA ruang kelas sekarang memuat stylesheet workspace saat navigasi di dalam aplikasi, sehingga workspace papan tulis, jarak sidebar, tile chat, dan kontrol agenda tampil benar tanpa perlu muat ulang penuh.

## Stabilkan perpindahan workspace

Navigasi tile dan slideshow sekarang menjaga workspace aktif tetap pada urutan visual yang benar, mempertahankan tombol pengubah tata letak saat chat terbuka, menginisialisasi tampilan chat dan whiteboard secara konsisten, dan mengembalikan siswa ke tampilan kelas dengan toast saat guru keluar.

## Tingkatkan unggahan materi guru

Unggahan pustaka guru sekarang memakai jalur penyimpanan `teacher-materials/`, memakai SVG unggah bersama di pemilih file, tidak lagi membuka popup dua kali, dan memakai batas unggahan dokumen yang lebih besar untuk materi kelas.

## Pindahkan Kepemilikan Notepad ke Adapter Notepad

Logika API agenda kelas dan berkas notepad sekarang berada di adapter study/notepad, sementara adapter classes hanya menyediakan kapabilitas sumber daya kelas bersama. Adapter notepad kini menangani snapshot agenda, rute berkas catatan, dan pengaturan batas ukuran berkas maksimum lewat permukaan konfigurasi adapter study.

## Tambahkan Konfigurasi Admin Nextcloud Whiteboard

Modul Nextcloud Whiteboard sekarang menyediakan popup pengaturan Administration serta rute konfigurasi persisten di `/api/v1/modules/nextcloud-whiteboard/config`. URL, rahasia penandatanganan, dan masa berlaku token disimpan di database dan dipakai untuk pembuatan token embed saat runtime.

## Gabungkan tombol Buka Obrolan menjadi Obrolan

Tombol "Buka Obrolan" yang duplikat dihapus dari bilah aksi papan tulis. Tombol yang tersisa di tab workspace kini diberi label "Obrolan" agar lebih ringkas.

## Tile aktif ditukar dengan tile lain saat dipilih

Hanya tile aktif yang memiliki area konten. Mengklik tile yang tidak aktif menukarnya dengan tile aktif saat ini sehingga tile aktif selalu tampil paling akhir dalam tumpukan.

## Sinkronisasi status tampilan guru dipisahkan dari polling snapshot

Siswa secara mandiri menanyakan endpoint API khusus untuk fokus papan dan tata letak tile guru pada setiap pembaruan data dan kejadian SSE, sehingga sinkronisasi bekerja di tampilan slideshow maupun tile.

## Gaya jendela obrolan dimiliki oleh adapter messages

Semua aturan CSS panel obrolan kelas dipindahkan ke adapter messages agar panel obrolan tampil seragam dengan halaman Messages.

## Materi guru menyimpan nama file asli

Unggahan pustaka materi guru sekarang menyimpan nama file asli dan tipe konten sebagai metadata pustaka, sehingga pemilih dan materi kelas tertaut menampilkan nama yang bermakna alih-alih kunci UUID mentah.

## Materi kelas terbuka di ruang kelas

Membuka materi kelas sekarang beralih ke penampil inline di workspace ruang kelas, bukan mencoba merender berkas di sidebar. Ini mencegah pemuatan berkas inline tanpa otorisasi dan menjaga materi aktif tetap berada di permukaan utama pengajaran.

## Meeting lebih tahan terhadap jeda idle

Meeting kelas Jitsi sekarang mempertahankan entri kehadiran tetap aktif jauh lebih lama sebelum backend menganggap peserta hilang, sehingga penghentian meeting palsu akibat heartbeat browser yang terlambat berkurang.

## Tombol navigasi slideshow menggunakan boilerplate bersama

Tombol navigasi kini dibuat dari satu fungsi pembantu yang dibagi antara render awal dan pembaruan tile dinamis. Tombol disembunyikan secara otomatis pada tampilan Obrolan.

## Berkas metadata tidak lagi muncul dalam daftar materi guru

Berkas indeks metadata (`.library-metadata.json`) salah ditampilkan dalam daftar materi, dan nama berkas yang diunggah tampil sebagai kunci UUID mentah. Kedua masalah disebabkan oleh bug garis miring ganda di gateway berkas lokal. Gateway kini menormalisasi garis miring di akhir sebelum membuat kunci jalur relatif.

## Interaksi pemilih berkas notepad kini berfungsi dengan benar

Callback pemilih berkas notepad terdaftar di bawah kunci `onMount` yang tidak didukung, bukan `onOpen`, sehingga tombol Buka, Ganti Nama, dan Hapus tidak pernah berfungsi. Dialog simpan juga memiliki tombol Buka hijau yang redundan di samping Simpan. Kedua masalah telah diperbaiki; tombol Ganti Nama kini bergaya netral, bukan merah.

## Keanggotaan kelas diberlakukan untuk akses berkas siswa

Berkas materi guru kini disajikan melalui rute berbasis kelas yang memverifikasi bahwa pengguna yang meminta terdaftar di kelas tersebut. Siswa dan guru menggunakan `/api/v1/study/classes/:id/materials/files/:key` sebagai pengganti API berkas umum. Kunci divalidasi terhadap daftar sumber daya kelas untuk mencegah path traversal.
