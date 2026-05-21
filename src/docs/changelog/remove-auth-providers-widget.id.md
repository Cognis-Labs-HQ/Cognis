# Update Auth dan Kata Sandi

## Menghapus widget penyedia auth yang duplikat dari Administrasi

Widget kartu penyedia auth telah dihapus dari bagian Autentikasi di Administrasi karena sudah muncul di halaman Komponen. Seluruh bagian admin Autentikasi telah dihapus.

## Kebijakan kata sandi dipindahkan ke Administrasi → Keamanan

Widget konfigurasi kebijakan kata sandi telah dipindahkan dari bagian Autentikasi lama ke bagian Keamanan di Administrasi. Sekarang terintegrasi dengan pelacak dirty-state standar, sehingga perubahan disimpan atau dibatalkan melalui bilah perubahan terpadu, bukan melalui tombol Simpan khusus.

## Kebijakan kata sandi menggunakan nilai minimum numerik untuk kelas karakter

Persyaratan huruf kapital, angka, dan karakter khusus kini menggunakan input numerik, bukan sakelar toggle. Menetapkan nilai ke 0 (default) menonaktifkan persyaratan tersebut; bilangan bulat positif menetapkan jumlah minimum karakter dari kelas tersebut yang harus ada dalam kata sandi.

## Halaman registrasi: validasi nama pengguna secara langsung

Formulir registrasi kini menampilkan peringatan langsung di bawah kolom nama pengguna begitu pengguna mengetikkan karakter yang bukan karakter ASCII yang dapat dicetak atau huruf besar. Peringatan muncul segera saat input, bukan hanya saat pengiriman formulir.

## Halaman registrasi: titik-titik kebijakan kata sandi yang selalu terlihat

Kolom kata sandi pada halaman registrasi kini selalu menampilkan semua persyaratan kebijakan yang berlaku sebagai daftar poin-poin di bawah kolom tersebut. Setiap poin diperbarui secara langsung saat pengguna mengetik: persyaratan yang terpenuhi ditampilkan hijau dengan tanda centang, sedangkan yang belum terpenuhi ditampilkan merah.

## Utilitas form builder untuk kriteria terstruktur

Utilitas form builder reusable baru sekarang menangani render dan validasi formulir registrasi melalui definisi field dan kriteria terstruktur yang diberikan lewat konteks bersama (`ctx`). Ini menjadi pola reusable agar formulir berikutnya dapat mendeklarasikan aturan validasi sebagai data, bukan logika DOM khusus per field.

## Batas nama pengguna kini memberi peringatan, bukan memblokir input

Kolom nama pengguna tidak lagi berhenti paksa di 25 karakter. Pengguna tetap bisa mengetik, dan peringatan inline langsung muncul saat nilai melewati 25 karakter.

## Field wajib dan validasi kini memakai status visual invalid

Field wajib sekarang menampilkan tanda bintang di bawah input dan menerapkan bayangan merah saat dibiarkan kosong atau saat kriteria tidak terpenuhi.

## Kriteria kata sandi dipindahkan ke panel alert mengambang

Persyaratan kata sandi kini ditampilkan dalam panel alert kriteria yang mengambang di dekat kolom kata sandi, dengan warna hijau untuk kriteria yang terpenuhi dan merah untuk yang belum terpenuhi.
