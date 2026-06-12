# Perombakan Halaman Kelas

## Animasi judul tile 4× lebih lambat

Animasi shimmer judul tile aktif kini berjalan selama 6,4 dtk, bukan 1,6 dtk, menghasilkan efek denyut yang lebih tenang dan mudah dibaca.

## Tombol navigasi slideshow tanpa animasi hover

Panah sebelumnya/berikutnya kini tidak menampilkan transisi hover atau animasi shimmer.

## Sinkronisasi tampilan guru mencakup Whiteboard dan Notepad

Beralih ke tab Whiteboard atau Notepad kini menyebarkan perubahan fokus ke siswa secara real-time, memperbaiki bug di mana siswa tidak melihat pembaruan.

## Tata letak tile (Slideshow / Ditumpuk) disinkronkan ke siswa

Pilihan guru antara tampilan Slideshow dan tile bertumpuk disimpan dan disebarkan ke siswa pada polling real-time berikutnya.

## Siswa dikunci saat guru hadir

Saat guru sedang online di kelas yang dipilih, siswa tidak dapat mengganti tile, menavigasi slide, atau menggunakan tombol tab workspace. Kontrol akan diredup dan dikunci secara otomatis.

## Pengeditan agenda dikirim ke siswa secara real-time

Mengetik di editor agenda kini secara otomatis mengirim dokumen yang diperbarui ke server melalui PUT, sehingga siswa melihat agenda terbaru tanpa perlu menyimpan secara manual.

## Toolbar agenda dan tombol Baru

Toolbar pemformatan Markdown (Tebal, Miring, Coret, Kode, Kutipan, Tautan, Judul) kini muncul di atas input agenda. Tombol Baru membuat dokumen agenda kosong.

## Dropdown snapshot agenda disesuaikan dengan lebar konten

Elemen pilih agenda tersimpan kini menyesuaikan ukurannya dengan lebar konten.

## Header "Materi Kelas" konsisten dengan header "Siswa"

Label "Materi Kelas" kini dirender sebagai judul bagian biasa yang cocok dengan gaya judul "Siswa".

## Pengubahan ukuran textarea agenda dinonaktifkan

Kotak teks agenda tidak lagi dapat diubah ukurannya secara manual.

## Font kapur dipulihkan dan sedikit lebih besar

Permukaan papan tulis kini secara eksplisit menerapkan font kapur dengan ukuran dasar yang sedikit lebih besar.

## Batas bagian bilah sisi dihapus

Batas pemisah yang terlihat di antara bagian bilah sisi telah dihapus untuk tampilan yang lebih bersih.

## Notifikasi rapat dinonaktifkan jika sudah berada di kelas

Siswa yang sudah melihat kelas tidak lagi menerima notifikasi rapat dimulai untuk kelas yang sama.

## Pembaruan agenda kini langsung terlihat oleh siswa

Ketika guru menyimpan perubahan agenda, tampilan siswa kini dirender ulang
segera pada siklus refresh berikutnya, tanpa perlu melakukan navigasi halaman
secara manual.

## Siswa dapat berpindah tab ruang kerja secara bebas

Sebuah bug menyebabkan pengaturan fokus papan guru menimpa tab ruang kerja yang
dipilih siswa pada setiap siklus refresh 3 detik, bahkan ketika guru tidak
menetapkan preferensi fokus secara eksplisit. Perbaikan ini memeriksa apakah
nilai yang tidak kosong benar-benar ada sebelum menimpa pilihan tab siswa.

## Siswa tidak lagi otomatis bergabung ke rapat saat membuka halaman

Bergabung otomatis kini hanya dipicu ketika rapat baru terdeteksi pada siklus
refresh, bukan untuk rapat yang sudah berlangsung ketika siswa membuka halaman.

## Guru kini dapat kembali ke tampilan Classroom

Mengklik tab Classroom kini mengatur mode ruang kerja dengan benar dan
merender ulang panel untuk guru.

## Siswa otomatis diarahkan ke Papan Tulis aktif

Ketika guru mengaktifkan papan tulis, siswa menerima token embed saat pemuatan
data awal dan langsung dinavigasi ke tile Papan Tulis.

## Penyimpanan otomatis agenda tidak lagi mencuri fokus dari kotak teks

Timer penyimpanan otomatis kini memperbarui status dokumen di memori secara
langsung tanpa memuat ulang semua metadata kelas dan merender ulang seluruh DOM.

## Toolbar agenda ditingkatkan dengan kontrol gaya teks

Toolbar agenda kini menyertakan dropdown gaya teks (Normal, Judul 1–3, Kutipan,
Blok Kode) seperti editor Markdown pada umumnya.

## Upload materi menggunakan tombol unggah platform yang konsisten

Pemicu upload di popup Materi Guru kini menggunakan elemen tombol yang tepat.

## Alur upload materi mengirim toast konfirmasi dan kegagalan

Mengunggah file kini menghasilkan toast berhasil atau gagal, dan file langsung
muncul di daftar perpustakaan dengan nama, tipe, ukuran, dan tanggal.

## Daftar perpustakaan materi menampilkan metadata file

Setiap entri perpustakaan kini menampilkan nama file yang dipotong, ekstensi
dalam huruf besar, ukuran file, dan tanggal pembuatan.

## Status "Tidak ada yang ditemukan" ditampilkan saat tidak ada materi kelas

Sidebar materi kini menampilkan pesan "Tidak ada yang ditemukan" yang teduh
ketika tidak ada materi kelas tertaut.

## Beralih antara tampilan tile dan slideshow mempertahankan rapat aktif

Mengalihkan layout tile tidak lagi mereset iframe rapat.

## Mode ruang kerja guru dipulihkan setelah refresh halaman

Mode ruang kerja terakhir guru dibaca dari snapshot board-focus yang tersimpan
dan dipulihkan saat halaman dimuat.

## Preferensi tile/slideshow disimpan di preferensi pengguna

Layout terakhir setiap pengguna kini disimpan melalui API preferensi pengguna
berbasis database, bukan localStorage, sehingga tetap tersimpan lintas perangkat
dan sesi browser.

## Pemilih unggah materi guru berfungsi lagi

Popup Materi Guru kini mengikat input unggah saat popup dibuka, sehingga pemilih
berkas sistem dan alur unggah ke pustaka kembali bekerja.

## Meeting kelas mempertahankan kontrol dan keepalive

Tile meeting kini memperbarui kontrol slideshow tanpa membuat ulang iframe
meeting, dan embed kelas mengirim penyegaran presence tambahan saat fokus atau
visibilitas berubah untuk mengurangi putus karena tidak aktif.

## Siswa mempertahankan preferensi tile/slideshow mereka sendiri

Layout yang disiarkan guru tidak lagi menimpa preferensi layout pribadi siswa.

## Popup "Edit Agenda" untuk mengganti nama dan menghapus agenda tersimpan

Tombol "Edit Agenda" baru membuka popup yang mencantumkan semua snapshot agenda
tersimpan dengan tindakan ubah nama dan hapus secara inline.

## Rute API untuk mengubah nama dan menghapus snapshot ditambahkan

`PATCH /agenda/snapshots/:snapshotId` dan `DELETE /agenda/snapshots/:snapshotId`
kini tersedia untuk guru.
