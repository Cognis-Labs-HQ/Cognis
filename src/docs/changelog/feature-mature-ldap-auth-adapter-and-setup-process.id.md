# Penyiapan direktori LDAP yang andal

## Penemuan langsung OpenLDAP dan FreeIPA

Penyiapan LDAP kini melakukan bind ke direktori yang dikonfigurasi dan membaca pengguna serta grup nyata sebelum konfigurasi dilanjutkan. Atribut nama pengguna, pencarian berhalaman yang dibatasi, keanggotaan bertingkat, dan filter yang lebih aman kini didukung.

## Pemetaan peran dan kontrol writeback yang jelas

Administrator dapat memetakan grup LDAP yang ditemukan ke setiap peran Cognis melalui tabel. Detail writeback kata sandi tetap tersembunyi sampai writeback diaktifkan.

## Pencarian direktori terarah dan pilihan login yang lebih jelas

DN pengguna dan grup opsional dapat mempersempit pencarian LDAP, sedangkan DN dasar tetap menjadi nilai cadangan. Pilihan grup diurutkan menurut abjad dan menampilkan nama ringkas. Kontrol sumber login kini muncul sebelum kolom kredensial dengan pilihan aktif yang terlihat jelas.
