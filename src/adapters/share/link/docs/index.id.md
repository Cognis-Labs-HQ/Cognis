# Adapter berbagi tautan

Adapter mendeklarasikan popup Link beserta kapabilitasnya melalui `navbarPlugins`. Gateway memuat kontribusi yang dideklarasikan dan menonaktifkannya bersama adapter pemilik.

## Contoh penggunaan

Membuat tautan publik yang dapat kedaluwarsa melalui gateway Share. Adapter memiliki penyiapan masukan khusus tautan dan halaman Tautan di dalam popup gateway.

## Spesifikasi teknis

Adaptor memvalidasi input penerima atau token khusus metode, mendelegasikan orkestrasi sumber daya bersama ke gateway Share, dan hanya aktif selama gateway pemilik serta siklus hidup adaptor diaktifkan.

Pemanggil dapat menetapkan `allowedPermissions: ["read"]` pada dialog berbagi untuk menampilkan hanya izin yang diterapkan sumber daya. Pilihan pengguna dan perubahan mengikuti daftar tersebut. Pemilik sumber daya tetap harus menegakkan izin yang sama pada alur otorisasi.
