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
