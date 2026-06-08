# Perbaikan Memori Formulir

## Dropdown peran dikecualikan dari memori formulir

Dropdown peran di halaman Pengguna kini dikecualikan dari memori draf formulir page composer. Sebelumnya, perender ulang tabel pengguna (misalnya setelah perubahan peran gagal dan composer menyegarkan) dapat memulihkan nilai peran yang usang dari penyimpanan draf ke dalam dropdown, yang berpotensi menyembunyikan status sisi server yang sebenarnya.

## Persistensi draf pesan per ruangan

Komposer Pesan kini menyimpan draf per ruangan, dikunci berdasarkan akun dan ID ruangan. Mengetik di suatu ruangan, berpindah ke ruangan lain, lalu kembali akan memulihkan draf sebelumnya. Mengirim pesan akan menghapus draf untuk ruangan tersebut. Ini menggantikan perilaku sebelumnya di mana teks di komposer akan tetap ada di semua perpindahan ruangan, terlepas dari ruangan mana yang dimaksud.
