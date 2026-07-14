# Namespace & Kuota File

## Gateway file kini mengatur semua konten ke dalam namespace dengan ACL dan kuota yang ditegakkan

Setiap operasi file kini dibatasi pada satu namespace — area konten terisolasi yang dimiliki oleh komponen tertentu (`profile`, `chats`, `classes`) atau oleh inti (`default`, `user`). Namespace mendeklarasikan batas ACL (`private-owner`, `private-group`, atau `component-managed`) yang membatasi apa yang boleh diekspos oleh objek apa pun yang disimpan di dalamnya, dan izin per-objek (pemilik, grup kolaborator, atau baca publik) tidak akan pernah dapat melebihi batas tersebut. Akses lintas komponen ke namespace ditolak kecuali namespace tersebut secara eksplisit mengizinkan komponen pemanggil (inti selalu diizinkan).

## Kuota penyimpanan per-namespace dan global

Adapter kuota file baru melacak kuota penyimpanan default yang dapat dikonfigurasi admin per namespace ditambah satu default global tunggal, mengambil snapshot ke dalam override per-pengguna pada waktu pembuatan akun sehingga kuota pengguna mencerminkan apa yang berlaku saat mereka mendaftar. Admin dapat menyesuaikan kuota pengguna individu setelahnya melalui aksi baru "Kuota Penyimpanan" pada halaman Pengguna. Penulisan yang akan melebihi salah satu kuota akan ditolak dengan error `413 quota_exceeded`.

## Avatar dan banner profil dimigrasikan ke namespace "profile" yang baru

Unggahan avatar dan banner adapter social/profile kini menggunakan kapabilitas `files:store`/`files:delete` berbasis namespace milik gateway file terhadap namespace `profile` yang dapat dibaca secara luas, menggantikan rute bucket file generik lama yang tidak berbasis namespace. Adapter `social/messages` dan `study/classes` masing-masing mendaftarkan namespace dasar `chats` dan `classes`, siap untuk fitur lampiran di masa depan.
