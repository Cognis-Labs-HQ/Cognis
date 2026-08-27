# Pembaruan Modul Andal

## Kanal terhapus dipulihkan

Ketika kanal rilis yang terpasang telah dihapus, pemindaian marketplace kini memindahkan target pembaruan yang tersedia ke cabang default repositori dan tidak mempertahankan kanal cache yang tidak dapat digunakan. Modul kemudian dapat diperbarui secara normal.

## Kegagalan validasi lebih jelas

Kegagalan validasi saat mengaktifkan modul kini menghasilkan kesalahan API terstruktur yang aman. Administrasi menampilkan toast kegagalan validasi yang diterjemahkan dan mengarahkan operator ke log server, bukan menampilkan kegagalan permintaan umum.
