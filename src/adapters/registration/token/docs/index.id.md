# Token Pendaftaran

Adapter Token Pendaftaran wajib memiliki token undangan dan otorisasi pembuatan akun. Adapter ini mengirim tautan sekali pakai melalui adapter notifikasi SMTP dan menjadi sumber token yang dipakai halaman Pengguna untuk undangan administrator dan pendiri.

## Contoh penggunaan

Administrator dan pendiri menerbitkan undangan melalui halaman Pengguna. Penyedia autentikasi eksternal meneruskan email terverifikasi dan token pendaftaran melalui alur gerbang pembuatan akun, bukan mengimpor adapter.

## Spesifikasi teknis

Saat pendaftaran publik dinonaktifkan, autentikasi eksternal hanya dapat membuat akun Cognis jika sesinya menyediakan token valid dan email penyedia cocok dengan email undangan. Jika penyedia tidak memberikan email, gerbang akun melaporkan bahwa masukan email diperlukan. Membatalkan permintaan tersebut atau tidak memberikan otorisasi akan membatalkan proses masuk tanpa membuat akun.

Token hanya dipakai setelah akun eksternal berhasil disimpan, dan alamat undangan yang cocok dicatat sebagai email utama terverifikasi akun. Kegagalan penyimpanan akun atau email membuat undangan tetap dapat digunakan. Undangan pengganti baru menggantikan tautan tertunda sebelumnya setelah emailnya berhasil dikirim.
