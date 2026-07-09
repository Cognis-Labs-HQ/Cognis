# Perbaikan Pemuatan Modul Statis

## Aset statis melewati rute catch-all

Aset UI statis kini disajikan sebelum rute catch-all terdaftar sehingga impor dinamis yang dapat digunakan ulang tidak lagi dicegat oleh handler yang dilindungi auth dan dikembalikan sebagai respons 401.
