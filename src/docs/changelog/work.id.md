# Uji koneksi lebih jelas

## LDAP menjelaskan kegagalan bind

Penyiapan LDAP kini menerjemahkan kode galat direktori 0x31 menjadi panduan untuk memeriksa DN bind dan kata sandi, sementara penyebab terperinci tetap dicatat secara terstruktur di log server.

## Uji SMTP memakai antrean pengiriman

Pesan uji SMTP kini melewati antrean dan pembatas laju milik adapter. Uji yang gagal memberikan respons khusus yang dapat ditindaklanjuti, bukan kegagalan permintaan umum.
