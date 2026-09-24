# Latihan Menulis

## Tujuan

Adapter Drawing menyediakan `study:drawing:open` melalui `uiCtx` peramban. Pemanggil memberikan kartu Library lengkap beserta `strokePattern` tervalidasi; adapter membuka papan tulis PiP yang dapat dipindahkan dan diubah ukurannya.

## Model latihan

Papan menerima pena, sentuhan, dan tetikus, menegakkan urutan goresan dari penyedia, menilai arah serta kedekatan jalur, melacak goresan selesai, menyediakan urungkan/atur ulang, dan empat tingkat panduan dari ingatan bebas hingga pola lengkap.

Penilaian goresan mengambil sampel ulang kedua jalur secara seragam dan menggabungkan deviasi RMS per titik, posisi titik akhir, arah, serta rasio panjang sehingga stabil untuk karakter kompleks yang padat. Percobaan pertama menampilkan pola lengkap tanpa kontrol panduan atau penghitung. Kesalahan berurutan pertama menampilkan goresan yang diharapkan, kesalahan berikutnya menampilkan goresan selanjutnya, lalu akhirnya seluruh pola. Goresan yang salah memicu guncangan merah; penyelesaian karakter memicu guncangan hijau dan bunyi keberhasilan singkat yang dibuat oleh aplikasi. PiP meminta dimensi yang memuat kanvas persegi beserta kontrol, menskalakan kanvas pada kedua sumbu secara independen, dan mengikuti tema terang atau gelap aktif.
