# Tampilan Berbagai Perangkat

**Cabang Fitur:** feature-core-device-layouts

## Ruang Kerja Responsif

Panel Kalender sempit menampilkan agenda berisi setiap acara dan tanggal terpilih, dengan pemilih tampilan serta tanggal yang ringkas. Panel lebar mempertahankan kisi kalender. Kolom tanggal mencapai tanggal kosong tanpa menggulir satu bulan. Kalender bersama memakai presentasi yang sama dan menegakkan akses baca saja.

Pesan menyesuaikan utas dan kolom penulisan dengan area layar yang terlihat. Tombol panel bersama membuka daftar ruang pada ponsel dan tablet. Escape mengembalikan fokus, pemilihan menutup daftar, dan perubahan orientasi mempertahankan draf. Layar pendek menggulir ruang kerja yang dapat digunakan alih-alih memotong kontrol.

## Composer

Page composer menentukan presentasi. Setiap perender elemen menerima konteks tetap berisi `compact`, `layout`, `drawer`, dan `touch`. Pemilihan memakai lebar dalam kartu yang tersedia, termasuk perubahan akibat bilah samping atau tata letak bersarang. Gunakan `responsive: true` untuk markup berbeda saat presentasi berubah; elemen biasa yang menyimpan keadaan mempertahankan DOM. Gunakan `onResize(presentation)` untuk pembaruan geometri. Kode halaman tidak memerlukan kueri layar atau penangan perubahan ukuran sendiri.

Bilah alat desktop memakai kolom bersama yang dibatasi agar konten memperoleh ruang yang cukup. Kolom mengikuti ukuran teks pilihan; ponsel dan tablet memakai panel Composer.

Nilai `layout` bersama adalah `compact` (hingga 640px), `medium` (hingga 900px), dan `regular`, berdasarkan lebar dalam kartu. Tampilan padat seperti Kalender memakai agenda pada kedua presentasi terbatas.

Atribut gaya `data-composer-layout`, `data-composer-drawer`, dan `data-composer-touch` dikelola composer untuk tata letak dan masukan. Komposisi biasa maupun bersarang menerima konteks yang sama. Composer mengamati konten dan kartu, memulihkan nilai formulir, serta melepaskan pengamat dan penangan peristiwa saat halaman berakhir.

## Navigasi Halaman dan Panel

Gunakan kisi Halaman pada kepala utama untuk berpindah tujuan. Pemilih halaman ringkas mempertahankan fokus papan ketik dan ditutup dengan Escape. Page Composer menyediakan tombol SVG sudut ganda yang sama di kiri atas untuk semua panel samping. Pesan memakai tombol ini untuk percakapan.

## Konten Seluler yang Terbaca

Kalender menjaga kontrol di atas agenda yang dapat digulir tersendiri, dengan ikon Tambah Acara yang aksesibel di samping setiap tanggal. Pesan membatasi judul ruang panjang menjadi dua baris terlihat sambil mempertahankan judul lengkap yang aksesibel. Profil menampilkan identitas, penulisan pos, dan linimasa pos sebelum bagian sosial tambahan pada ponsel dan tablet; biografi serta isi pos membungkus secara alami.

`stackAt: "medium"` meminta satu kolom mengalir hingga batas tablet bersama. `readingOrder` menentukan urutan elemen pada tampilan itu tanpa mengubah tata letak desktop tersimpan. Elemen formulir dan draf bertahan saat tata letak berubah.

Pratinjau kartu belajar memakai permukaan pembaca bersama. Dialog mengikuti lebar tersedia, menjaga judul dan tindakan Sebelumnya/Berikutnya terlihat, serta menggulir konten panjang secara terpisah. Kontrol tablet dan sentuh tetap bersasaran 44px; rincian sempit disusun vertikal.

Kepala dan kaki halaman memakai satu lebar kerangka sehingga tepi luarnya sejajar pada ponsel, tablet, dan desktop.

Pratinjau menampilkan judul dan isi terkini sebelum diterbitkan. Kembali ke mode Tulis atau putar perangkat tanpa kehilangan draf.

Pos yang diterbitkan langsung tampil, dan penghapusan memperbarui linimasa tanpa memuat ulang halaman.

Elemen dapat mendeklarasikan wadah stabil `data-composer-header`. Composer menempatkan kontrol panel di sana dan mempertahankan tombol serta perilaku fokus saat digambar ulang. Konten yang diganti asinkron ditempatkan di anak wadah tersebut. Penanda gaya `data-composer-sidebar-trigger` menunjukkan kontrol bersama. Kalender dan Pesan memakai tempat ini agar lebih banyak ruang vertikal tersedia untuk konten.

## Isolasi Komponen

Fixture ukuran tampilan Kalender dan Pesan berada di komponen pemiliknya. Fixture browser menyediakan aset komponen secara eksplisit dan menggunakan implementasi uji untuk kontrak eksternal, sambil mempertahankan pemeriksaan tata letak berisi data, draf, kontrol sentuh, dan pelepasan sumber daya. Tutorial Pesan menggunakan penanda bilah samping publik Composer.

Composer menonaktifkan penjangkaran gulir browser di seluruh konten kisi agar perubahan lebar mempertahankan posisi gulir di dalamnya. Komponen pemilik konten mengatur pengguliran saat menambahkan atau mengganti konten.

## Bilah Samping Ringkas

Pesan menampilkan Ruang Baru, percakapan, dan Templat berdekatan dengan menggunakan seluruh lebar bilah samping. Daftar kosong dan pendek tidak lagi direntangkan setinggi panel. Daftar ruang dan templat yang panjang memakai satu area gulir Composer.

Jarak tepi bilah samping bersama menyesuaikan lebar yang tersedia. Desktop memakai satu jarak ke konten utama, sedangkan lebar panel dalam rem mengikuti ukuran teks yang lebih besar. Kontrol komponen dapat menyesuaikan ukurannya sambil mempertahankan sasaran sentuh yang nyaman.

## Komit

- [f4f6d3a84](https://github.com/Cognis-Labs-HQ/Cognis/commit/f4f6d3a84b587d4eb169b5db76b850956544ad31)
- [1ab4a71b2babcede98fe870eac78989dca014b38](https://github.com/Cognis-Labs-HQ/Cognis/commit/1ab4a71b2babcede98fe870eac78989dca014b38)
- [883db306dce10da3bf67b4fac29ca6c89f2ae5b9](https://github.com/Cognis-Labs-HQ/Cognis/commit/883db306dce10da3bf67b4fac29ca6c89f2ae5b9)
- [a0e4d976a436221c63c31eb622a55524de1b6bf0](https://github.com/Cognis-Labs-HQ/Cognis/commit/a0e4d976a436221c63c31eb622a55524de1b6bf0)
- [7127b6fa0650fb93631a2650e8014ceb8daffa6c](https://github.com/Cognis-Labs-HQ/Cognis/commit/7127b6fa0650fb93631a2650e8014ceb8daffa6c)
