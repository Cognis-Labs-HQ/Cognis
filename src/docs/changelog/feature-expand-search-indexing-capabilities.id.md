# Opsi Pencarian

## Indeks Pencarian Diperluas

Popup pencarian global kini memiliki utilitas pendaftaran dinamis sehingga halaman, konten halaman yang terlihat, postingan, chat, pesan, dan permukaan UI milik komponen dapat menyumbangkan kategori hasil yang dapat dicari.

## Kontrol Kecocokan

Popup pencarian kini menyertakan kontrol untuk pencocokan kata utuh, ekspresi reguler, dan peka huruf besar-kecil.

## Hasil Lebih Jelas

Hasil pencarian kini mengutamakan nama dan deskripsi konten, menyorot kecocokan persis, serta menampilkan cuplikan teks di sekitarnya saat teks konten cocok.

# Hasil Pencarian Lebih Jelas

## Study memiliki indeks pencariannya

Study kini mendaftarkan jalur pencarian Pages miliknya sendiri dari navbar gateway Study, sementara modul bahasa terdaftar berkontribusi melalui daftar modul Study alih-alih utilitas pencarian umum memiliki pengindeksan khusus Study.

## Pencarian menemukan halaman Study dan posting yang terlihat

Study kini menambahkan halaman gateway serta setiap subhalaman bahasa Inggris dan Jepang yang terdaftar ke kategori Pages, dan pencarian profil sosial mengindeks secara dinamis setiap posting yang boleh dilihat pengguna yang masuk.

## Arsitektur pencarian kini berbasis komponen

Pengindeksan pencarian kini menyediakan kapabilitas pencarian berbasis ctx dengan jalur per komponen, dan pencarian pesan dipindahkan ke modul indeks milik komponen yang memakai bentuk hasil standar untuk konten pengguna.

## Popup pencarian lebih mudah ditutup

Tombol batal mengambang kini berada di kanan atas popup pencarian sehingga pengguna dapat menutup pencarian langsung tanpa bergantung pada Escape atau klik di luar popup.

## Indeks bersama mencakup halaman dan pesan

Docs, Changelog, Study, subhalaman Study, halaman dari menu pengguna, dan konten pesan kini didaftarkan dari permukaan bersama sehingga dapat dicari tanpa membuka setiap aplikasi terlebih dahulu. Sisa kategori Navigation digabungkan ke Pages, dan sorotan pencarian di halaman pada mode gelap kini memakai kombinasi hijau yang lebih pucat.

## Hasil pencarian yang difokuskan lebih jelas

Hasil pencarian kini memiliki latar hover dan fokus keyboard yang lebih kuat pada tema terang maupun gelap, sehingga baris yang sedang difokuskan lebih mudah diikuti saat menelusuri hasil.

## Halaman dan post lebih mudah ditemukan

Entri Navigation kini muncul di Pages, subhalaman Study menyertakan jalur induk seperti Study / Japanese / Hiragana, halaman Docs dan Changelog kembali masuk indeks halaman, kartu post yang terlihat diindeks langsung, dan sorotan pencarian di halaman memakai kontras hijau yang lebih kuat di tema terang maupun gelap.

## Hasil pencarian menghormati akses yang terlihat

Penyedia pencarian kini difilter sebelum ditampilkan agar target hasil yang tersembunyi atau tidak dapat diakses tidak membocorkan judul, cuplikan, timestamp, atau detail lain. Post, pesan, dan notifikasi juga menyertakan konteks terlihat bertimestamp, sementara subhalaman Study menghindari duplikasi hasil Navigation.

## Pencarian di halaman menggantikan hasil konten terlihat

Kategori hasil Visible Content yang lama kini menjadi filter pencarian On this page. Saat diaktifkan, popup membuat halaman tetap jelas, menyembunyikan hasil berkelompok, menyorot semua kecocokan teks di halaman, dan menampilkan penghitung posisi/jumlah dengan navigasi Enter serta tombol panah.

## Target pencarian disorot

Saat sebuah hasil dibuka, halaman kini menggulir ke elemen terkait dan menyorotnya sebentar. Ctrl+F juga membuka popup pencarian global, bukan pencarian bawaan browser.

## Pencarian pengaturan tetap berfokus pada tindakan

Pencarian pengaturan kini melewati teks paragraf pasif dan hanya mempertahankan heading, subhalaman, field, dan operasi sebagai hasil terpisah agar halaman pengaturan tetap mudah dipindai.

## Acara kalender diindeks secara global

Acara kalender kini didaftarkan dari kontribusi navigasi kalender, sehingga hasil acara dapat muncul di pencarian global tanpa harus membuka halaman kalender terlebih dahulu.

## Hasil menyertakan kelas

Halaman dan komponen kini menandai hasil pencarian sebagai halaman, judul, teks, pengaturan, operasi, preferensi, dan acara sehingga tampilan dan filter dapat membedakan jenis konten yang cocok.

## Deskripsi tampil sebagai hasil

Deskripsi pengaturan dan detail preferensi tersimpan kini diindeks sebagai hasil tersendiri, bukan ditambahkan sebagai cuplikan di bawah pengaturan induk.

## Filter kategori mempersempit hasil

Daftar kategori kini berfungsi sebagai filter multi-pilih sehingga pengguna dapat memfokuskan pencarian luas pada kategori hasil yang dibutuhkan.

## Kategori pencarian lebih mudah dipindai

Pencarian global kini menampilkan kategori hasil yang cocok di bawah kontrol pencarian saat beberapa kategori dikembalikan, sehingga pencarian yang luas lebih mudah dipahami sebelum meninjau tiap hasil.

## Operasi pengaturan dapat ditemukan

Operasi akun seperti mengarsipkan, menonaktifkan, dan menghapus akun kini diindeks sebagai operasi agar dapat ditemukan dari popup pencarian global.

## Konvensi utilitas pencarian didokumentasikan

Kode pencarian bersama kini hanya berada di `src/ui/reuse/search-util/`. Integrasi milik komponen sebaiknya memakai file khusus `ui/search/index.js`, mengekspor `createSearchIndex` untuk provider konten, dan memanggil helper bersama `registerSearchIndex`. Utilitas menangani pencocokan, peringkat, sorotan, filter, rendering, serta pengabaian hasil async usang, sementara provider komponen menjaga fetch mahal tetap asinkron.
