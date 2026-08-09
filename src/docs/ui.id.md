# UI

## Pengalih bahasa

Pengalih bahasa tetap diaktifkan secara bawaan dan dapat dikendalikan di atas tabel bahasa melalui Pengaturan Pengguna → Bahasa. Tombol dasbor menelusuri bahasa pilihan dan mengonfirmasi pilihan terakhir setelah lima detik. Klik kanan pada pengalih bahasa atau tema membuka halaman pengaturan yang sesuai.

## Ikhtisar

`src/ui/` menjadi tuan rumah frontend browser Cognis. Menyediakan alur kerja studi, permukaan interaksi sosial, panel administrasi, dan browser dokumentasi yang tertanam. UI adalah aplikasi multi-halaman yang di-render oleh server.

Lapisan UI tidak mengetahui gateway atau adapter mana yang terinstal. Sebaliknya, gateway berkontribusi elemen UI saat runtime melalui `UIRegistry` dan API page-extensions.

Semua teks yang terlihat pengguna melewati sistem i18n di `src/ui/reuse/i18n.js`. Tidak ada teks yang dikodekan secara keras di JavaScript atau template HTML.

## Tanggung Jawab

- Menjalankan semua titik masuk halaman dan template HTML terkait.
- Menyediakan shell layout yang digunakan semua halaman non-login untuk merender.
- Memelihara utilitas reuse untuk i18n, page composer, guard perubahan yang belum disimpan.
- Menegakkan paritas tema: setiap elemen menyelesaikan warnanya dari variabel CSS.
- Menyediakan paket string i18n untuk keempat bahasa yang diperlukan.

## Arsitektur

### Struktur Direktori

| Path                | Tujuan                                            |
| ------------------- | ------------------------------------------------- |
| `src/ui/layouts/`   | Shell HTML bersama                                |
| `src/ui/app/`       | Modul JavaScript titik masuk halaman              |
| `src/ui/reuse/`     | Modul utilitas lintas halaman                     |
| `src/ui/styles/`    | CSS: token dasar, layout, aturan spesifik halaman |
| `src/ui/languages/` | Paket string i18n (en, de, ja, id)                |

### Konvensi Kunci i18n

| Awalan               | Penggunaan                                                  |
| -------------------- | ----------------------------------------------------------- |
| `ui.reuse.*`         | Label yang dibagikan di beberapa halaman                    |
| `ui.reuse.generic.*` | Kata aksi mandiri bebas konteks (simpan, buang, atur ulang) |
| `ui.app.<page>.*`    | Teks spesifik halaman                                       |
| `ui.layout.*`        | Teks shell layout dan label ARIA                            |
