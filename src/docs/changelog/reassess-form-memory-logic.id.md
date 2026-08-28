# Perbaikan Memori Formulir

**Feature Branch:** copilot/reassess-form-memory-logic

## Dropdown peran dikecualikan dari memori formulir

Dropdown peran di halaman Pengguna kini dikecualikan dari memori draf formulir page composer. Sebelumnya, perender ulang tabel pengguna (misalnya setelah perubahan peran gagal dan composer menyegarkan) dapat memulihkan nilai peran yang usang dari penyimpanan draf ke dalam dropdown, yang berpotensi menyembunyikan status sisi server yang sebenarnya.

## Persistensi draf pesan per ruangan

Komposer Pesan kini menyimpan draf per ruangan, dikunci berdasarkan akun dan ID ruangan. Mengetik di suatu ruangan, berpindah ke ruangan lain, lalu kembali akan memulihkan draf sebelumnya. Mengirim pesan akan menghapus draf untuk ruangan tersebut. Ini menggantikan perilaku sebelumnya di mana teks di komposer akan tetap ada di semua perpindahan ruangan, terlepas dari ruangan mana yang dimaksud.

## Memori draf formulir kini bersifat opt-in

Penyimpanan draf formulir persisten pada page composer telah diubah dari model opt-out menjadi opt-in. Hanya field formulir yang leluhur terdekatnya memiliki atribut `data-composer-include-form-memory="true"` yang akan ditulis ke localStorage. Field tanpa leluhur opt-in tetap diambil dalam snapshot sementara di memori agar bertahan selama render ulang responsif dalam sesi browser yang sama, namun tidak pernah ditulis ke penyimpanan persisten. Ini mencegah kontrol yang dikendalikan server (dropdown peran, sakelar, select preferensi) disimpan di sisi klien.

## Textarea komposer dikosongkan saat beralih ke ruangan tanpa draf tersimpan

Sebelumnya, saat beralih dari ruangan yang memiliki teks yang belum dikirim ke ruangan yang tidak memiliki draf tersimpan, teks dari ruangan sebelumnya tetap ada di komposer. Peristiwa input sintetis yang segera dipicu setelah peralihan kemudian menyimpan teks usang tersebut di bawah kunci draf ruangan yang baru dibuka, sehingga berisiko mengirim pesan yang salah secara tidak sengaja. Textarea komposer kini dikosongkan secara eksplisit sebelum peristiwa input dipicu apabila ruangan yang dibuka tidak memiliki draf tersimpan.

## Commits

- [f6e4f64](https://github.com/Cognis-Labs-HQ/Cognis/commit/f6e4f64c9468e5367096836d041488b2f2f6ae34)
