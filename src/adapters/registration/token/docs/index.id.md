# Token Pendaftaran

Adapter Token Pendaftaran wajib memiliki token undangan dan otorisasi pembuatan akun. Adapter ini mengirim tautan sekali pakai melalui penyedia notifikasi email yang aktif dan menjadi sumber token yang dipakai halaman Pengguna untuk undangan administrator dan pendiri.

## Contoh penggunaan

Administrator dan pendiri menerbitkan undangan melalui halaman Pengguna. Penyedia autentikasi eksternal meneruskan email terverifikasi dan token pendaftaran melalui alur gerbang pembuatan akun, bukan mengimpor adapter.

## Spesifikasi teknis

Saat pendaftaran publik dinonaktifkan, autentikasi eksternal hanya dapat membuat akun Cognis jika sesinya menyediakan token valid dan email penyedia cocok dengan email undangan. Jika penyedia tidak memberikan email, gerbang akun melaporkan bahwa masukan email diperlukan. Membatalkan permintaan tersebut atau tidak memberikan otorisasi akan membatalkan proses masuk tanpa membuat akun.

Token hanya dipakai setelah akun eksternal berhasil disimpan, dan alamat undangan yang cocok dicatat sebagai email utama terverifikasi akun. Kegagalan penyimpanan akun atau email membuat undangan tetap dapat digunakan. Undangan pengganti baru menggantikan tautan tertunda sebelumnya setelah emailnya berhasil dikirim.

## Otorisasi SSO dan kebijakan undangan

Saat pendaftaran publik ditutup, Cognis menyimpan status penyedia terautentikasi di balik ID percobaan sementara yang buram dan menampilkan formulir token milik adapter ini di shell pendaftaran standar. Tindakan “Kirim Email Undangan” mengirim undangan melalui SMTP; hanya administrator dan pemilik yang dapat membuat token mandiri melalui “Buat Token Pendaftaran”. Pendaftaran publik melewati tahap token. Pengguna pendiri dapat memiliki paling banyak sepuluh undangan email tertunda sekaligus; undangan yang dipakai, dicabut, atau kedaluwarsa segera mengembalikan slotnya. Hanya pemilik yang dapat menonaktifkan undangan pendiri atau administrator di Administrasi → Pendaftaran.
