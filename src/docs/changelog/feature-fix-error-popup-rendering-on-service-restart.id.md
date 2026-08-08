# Popup galat yang andal selama gangguan layanan

## Popup galat tetap terbaca saat Cognis dimulai ulang

Cognis kini menyimpan stylesheet popup lengkap di Cache Storage sementara milik peramban selagi layanan merespons. Jika server sementara tidak tersedia selama proses mulai ulang, dialog galat runtime menggunakan stylesheet tersimpan tersebut alih-alih tampil sebagai konten halaman tanpa gaya.
