# Token Pendaftaran

Adapter Token Pendaftaran wajib memiliki token undangan dan otorisasi pembuatan akun. Adapter ini mengirim tautan sekali pakai melalui adapter notifikasi SMTP dan menjadi sumber token yang dipakai halaman Pengguna untuk undangan administrator dan pendiri.

Saat pendaftaran publik dinonaktifkan, autentikasi eksternal hanya dapat membuat akun Cognis jika sesinya menyediakan token valid dan email penyedia cocok dengan email undangan. Jika penyedia tidak memberikan email, gerbang akun melaporkan bahwa masukan email diperlukan. Membatalkan permintaan tersebut atau tidak memberikan otorisasi akan membatalkan proses masuk tanpa membuat akun.
