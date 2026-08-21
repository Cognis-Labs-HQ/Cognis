# Penyiapan Konfigurasi Modul yang Andal

## Mengonfigurasi modul nonaktif sebelum aktivasi

Saat rute konfigurasi milik modul belum tersedia, Cognis kini membuka formulir pengaturan dengan nilai bawaan manifes dan baru mengaktifkan modul ketika formulir disimpan. Nilai kemudian langsung ditulis melalui rute modul yang telah dipasang, sehingga kunci API wajib dapat disimpan tanpa galat 404 atau penyimpanan sementara di peramban.

## Menyelesaikan penyiapan wajib setelah respons aktivasi kosong

Alur aktivasi kini melanjutkan penyiapan konfigurasi wajib ketika endpoint aktivasi mengembalikan respons sukses kosong yang valid. Pengaturan tetap dapat dibuka melalui ikon roda gigi pada detail modul, dan penyiapan wajib yang gagal atau dibatalkan tetap mengembalikan modul ke keadaan nonaktif.
