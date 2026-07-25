# Penyiapan direktori LDAP yang andal

## Penemuan langsung OpenLDAP dan FreeIPA

Penyiapan LDAP kini melakukan bind ke direktori yang dikonfigurasi dan membaca pengguna serta grup nyata sebelum konfigurasi dilanjutkan. Atribut nama pengguna, pencarian berhalaman yang dibatasi, keanggotaan bertingkat, dan filter yang lebih aman kini didukung.

## Pemetaan peran dan kontrol writeback yang jelas

Administrator dapat memetakan grup LDAP yang ditemukan ke setiap peran Cognis melalui tabel. Detail writeback kata sandi tetap tersembunyi sampai writeback diaktifkan.

## Pencarian direktori terarah dan pilihan login yang lebih jelas

DN pengguna dan grup opsional dapat mempersempit pencarian LDAP, sedangkan DN dasar tetap menjadi nilai cadangan. Pilihan grup diurutkan menurut abjad dan menampilkan nama ringkas. Kontrol sumber login kini muncul sebelum kolom kredensial dengan pilihan aktif yang terlihat jelas.

## Tindakan akun milik penyedia dan sesi LDAP yang stabil

Setiap sumber login kini mengendalikan tindakan pemulihannya sendiri, sehingga tautan lupa kata sandi lokal menghilang saat LDAP dipilih. Perubahan kata sandi hanya ditawarkan jika didukung oleh penyedia akun aktif, termasuk LDAP ketika writeback diaktifkan. Sesi LDAP juga tidak lagi bergantung pada rekaman akun lokal yang cocok.

## Identitas akun eksternal yang persisten

Login LDAP yang berhasil kini membuat rekaman akun bersama dan identitas LDAP sebelum menyediakan profil. Urutan ini menjaga integritas foreign key basis data dan memberi akun LDAP landasan profil serta sesi yang sama seperti akun lokal tanpa membuat kredensial kata sandi lokal.

## Peralihan mode login yang andal

Kembali dari pemulihan kata sandi kini memulihkan formulir kredensial secara langsung, bukan menyegarkan konten halaman yang diparkir, sehingga pemilih sumber autentikasi tidak terduplikasi. Pemilih sumber kredensial juga disembunyikan selama tantangan autentikasi dua faktor aktif.

## Penemuan direktori yang akurat dan dapat diulang

Setiap proses Uji dan Temukan kini mengganti sampel sebelumnya sebelum membangun ulang pemetaan peran. Pencarian pengguna dan grup selalu menggunakan DN masing-masing, dengan DN dasar sebagai cadangan secara terpisah, dan objek LDAP yang bukan grup dikeluarkan dari pilihan grup.

## Batas penemuan yang diterapkan dan skema identitas

Penemuan kini menolak setiap entri direktori yang DN-nya berada di luar basis pencarian pengguna atau grup yang dikonfigurasi. Hal ini mencegah rekaman kontainer pengguna masuk ke pemetaan grup meskipun server memberikan hasil yang tidak terduga. Bootstrap autentikasi juga membuat tabel identitas eksternal sebelum login LDAP menyimpan identitas.

## Penyediaan email LDAP dan validasi langsung

Login LDAP kini membaca semua alamat email yang tercantum saat terikat sebagai pengguna yang sedang masuk, lalu menyediakannya di Cognis tanpa membuat kredensial lokal. Alamat pertama menjadi alamat utama. Jika validasi email diwajibkan, pesan verifikasi langsung dikirim dan alur login berlanjut langsung ke verifikasi kode.

## Pemuatan penyiapan milik adapter yang andal

Gateway autentikasi kini menyediakan antarmuka penyiapan LDAP melalui registri aset adapter, sehingga konfigurasi LDAP tidak lagi gagal dibuka karena skrip yang hilang.

## Penemuan ekstensi penyiapan secara eksplisit

Administrasi kini hanya memuat antarmuka penyiapan khusus jika adapter mengumumkannya. Adapter standar seperti SMTP menggunakan formulir generik tanpa menghasilkan permintaan skrip yang gagal.

## Beberapa sumber LDAP bernama

Administrator dapat mengelola dan mengurutkan ulang beberapa server LDAP bernama. Sumber dapat tampil secara terpisah pada halaman Masuk atau sebagai satu pilihan LDAP terpadu yang mencoba server sesuai urutan konfigurasi.

## Verifikasi kredensial pengguna wajib

Penyiapan LDAP kini diakhiri dengan bind wajib menggunakan kredensial pengguna direktori nyata. Identitas, grup, dan peran Cognis yang dihasilkan ditampilkan sebelum server dapat disimpan, dan pembatasan grup pengguna yang dipetakan diterapkan.

## Penempatan sumber masuk responsif

Pemilih sumber Lokal dan LDAP berada tepat di antara judul Masuk dan kolom Nama pengguna. Tombol sumber menyesuaikan diri dengan lebar yang tersedia, sedangkan sumber tambahan tersedia melalui pemilih luapan yang dapat digulir.

## Metadata sumber masuk dipertahankan

Konfigurasi masuk publik kini mempertahankan metadata sumber kredensial untuk setiap server LDAP bernama. Dengan demikian, Lokal dan semua sumber LDAP yang dikonfigurasi benar-benar tampil bersama pada baris pemilih. Sumber LDAP bernama yang tidak disatukan menggunakan pengenal yang ditentukan administrator sebagai label tombol.

## Rahasia bind LDAP terlindungi

Kata sandi bind LDAP yang tersimpan dihapus dari respons API administrasi. Membiarkan kolom kata sandi kosong akan mempertahankan rahasia yang ada, sedangkan nilai baru akan menggantinya secara aman.
