# Latihan Menulis

## Tujuan

Adapter Drawing menyediakan `study:drawing:open` melalui `uiCtx` peramban. Pemanggil memberikan kartu Library lengkap beserta `strokePattern` tervalidasi; adapter membuka papan tulis PiP yang dapat dipindahkan dan diubah ukurannya.

## Model latihan

Papan menerima pena, sentuhan, dan tetikus, menegakkan urutan goresan dari penyedia, menilai arah serta kedekatan jalur, melacak goresan selesai, menyediakan urungkan/atur ulang, dan empat tingkat panduan dari ingatan bebas hingga pola lengkap.

Penilaian goresan mengambil sampel ulang kedua jalur secara seragam dan menggabungkan deviasi RMS per titik, posisi titik akhir, arah, serta rasio panjang sehingga stabil untuk karakter kompleks yang padat. Panduan dipilih otomatis dari tingkat percobaan berhasil dan umpan balik Mudah/Sulit dari pelajar. PiP meminta dimensi yang memuat kanvas persegi beserta kontrol, menskalakan kanvas pada kedua sumbu secara independen, dan mengikuti tema terang atau gelap aktif.
