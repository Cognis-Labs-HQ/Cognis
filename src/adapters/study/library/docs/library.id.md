# Adaptor Pustaka

## Tujuan

Adaptor Pustaka menyimpan materi pembelajaran dan aktivitas yang dapat digunakan ulang serta dilacak di basis data. Setiap entri berada pada lapisan tetap dan cakupan global, kelas, atau pengguna. Lapisan kosong tidak ditampilkan.

## Lapisan standar

Urutannya adalah `alphabet`, `alt_characters`, `definitions`, `words`, `sentences`, `exercises`, `workouts`, `routines`, dan `collections`. Referensi merupakan hubungan terarah menuju unsur lapisan bawah yang diizinkan; koleksi dapat mengelompokkan semua lapisan selain koleksi lain.

## Akses dan pertukaran

Data global dapat dibaca semua pengguna, tetapi hanya admin dan pemilik yang dapat mengubah atau mengimpor JSON. Kelas dapat dibaca guru dan anggota aktif serta hanya dapat ditulis guru atau admin. Cakupan pengguna bersifat privat. Kapabilitas `study:library` mengekspos baca, tulis, penelusuran, permintaan kirim, serta ekspor JSON dan Anki melalui `ctx`.
