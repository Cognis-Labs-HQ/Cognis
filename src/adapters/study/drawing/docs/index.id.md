# Latihan Menulis

## Tujuan

Adapter Drawing menyediakan `study:drawing:open` melalui `uiCtx` peramban. Pemanggil memberikan kartu Library lengkap beserta `strokePattern` tervalidasi; adapter membuka papan tulis PiP yang dapat dipindahkan dan diubah ukurannya.

## Model latihan

Papan menerima pena, sentuhan, dan tetikus, menegakkan urutan goresan dari penyedia, menilai arah serta kedekatan jalur, melacak goresan selesai, dan menyediakan Atur ulang tanpa membalikkan panduan yang sudah dipelajari.

Hanya goresan saat ini yang dipandu. Jalur lengkapnya ditampilkan pada awalnya; goresan yang berhasil secara bertahap memperpendek panduan berikutnya, sedangkan kesalahan berulang memperpanjang panduan saat ini dari awal hingga titik akhirnya. Atur ulang menghapus goresan tertulis tanpa mengembalikan cakupan panduan sebelumnya. Goresan salah memicu guncangan merah; karakter lengkap memicu guncangan hijau dan bunyi keberhasilan singkat yang dibuat aplikasi. Judul menyejajarkan teks kartu dan definisi terlokalisasi, sedangkan tombol tutup seukuran konten mengikuti animasi buka dan tutup.
