# Referensi Teknis

Antarmuka publik dan aturan operasional UI.

## Antarmuka

UIRegistry menerbitkan direktori aset, plugin navigasi, bagian administrasi, dan perluasan halaman. Penyedia peramban memakai uiCtx serta sinyal pembersihan; halaman memakai Page Composer.

## Konfigurasi

Preferensi akun memilih tema, bahasa, dan font. Katalog komponen menyediakan terjemahan dan metadata; opsi tata letak tetap pada Page Composer.

## Perilaku

### Ikhtisar

`src/ui/` menjadi tuan rumah frontend browser Cognis. Menyediakan alur kerja studi, permukaan interaksi sosial, panel administrasi, dan browser dokumentasi yang tertanam. UI adalah aplikasi multi-halaman yang di-render oleh server.

Lapisan UI tidak mengetahui gateway atau adapter mana yang terinstal. Sebaliknya, gateway berkontribusi elemen UI saat runtime melalui `UIRegistry` dan API page-extensions.

Semua teks yang terlihat pengguna melewati sistem i18n di `src/ui/reuse/i18n.js`. Tidak ada teks yang dikodekan secara keras di JavaScript atau template HTML.

### Tanggung Jawab

- Menjalankan semua titik masuk halaman dan template HTML terkait.
- Menyediakan shell layout yang digunakan semua halaman non-login untuk merender.
- Memelihara utilitas reuse untuk i18n, page composer, guard perubahan yang belum disimpan.
- Menegakkan paritas tema: setiap elemen menyelesaikan warnanya dari variabel CSS.
- Menyediakan paket string i18n untuk keempat bahasa yang diperlukan.

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

### Pratinjau Gambar Bersama

Kapabilitas global `ui:imagePreview` menyediakan tampilan gambar mini, pengikatan interaksi, dan tindakan `open` melalui alur terdaftar `ui:imagePreview:open`. Fitur ini juga tersedia melalui `ui:reuse` sebagai `image-preview.js`; penyedianya memuat lembar gaya bersama sebelum menerbitkan kontrol. Tombol gambar membuka gambar asli dalam ukuran alaminya, dibatasi area layar, dengan hanya tombol X standar yang terlihat. Aktivasi papan ketik, Escape, pemulihan fokus, dan penutupan saat tampilan atau penyedia dilepas memakai siklus hidup popup bersama. Pemanggil mengelola URL gambar dan tindakan penghapusan opsional. Library memakai kontrol ini untuk gambar unggahan dan bawaan dalam editor serta galeri detail.

Penyedia pratinjau gambar bersama memuat lembar gayanya sebelum menerbitkan kontrol. Popup khusus gambar menghapus elemen judul dan menyesuaikan gambar asli lanskap, potret, serta panorama ke area layar tanpa gulir horizontal maupun vertikal. Pratinjau detail Library tetap dibatasi 20rem × 18rem; gambar mini editor tetap 8rem × 6rem.

### Navigasi Sesi Responsif

Keluar membersihkan data sesi pribadi tanpa menunggu pemeliharaan rute publik oleh pekerja layanan. Permintaan kebijakan identik memakai satu pertukaran tanpa menggabungkan keputusan akses yang berubah. Pengalih bahasa menunggu penyedia katalog dan menyembunyikan kontrol khusus akun setelah keluar. Salinan router dalam bundel dan yang dimuat langsung berbagi status dokumen, pendengar, dan pembatalan tampilan, termasuk navigasi Pengaturan ke Dasbor.

### Polling Marketplace Ringan

Perilaku ini dijelaskan dalam [kontrak bersama](/docs/api/technical).

## Keamanan

Navigasi tersembunyi bukan kontrol akses. Penyedia memakai kapabilitas pemilik dan membatalkan pekerjaan saat unmount atau pergantian akun; data privat terikat akun.

## Referensi

### Tutorial terpandu

Tutorial terikat pada halaman atau URL. Kunjungan pertama yang memenuhi syarat otomatis memulai tutorial halaman yang belum selesai. SVG tanda tanya di samping judul dalam `page-context` memutar ulang tutorial yang tersedia pada halaman itu. Host memiliki tampilan dan siklus hidup; fitur memiliki teks, target, dan skrip. Tutorial tidak mengubah izin.

`showToast(message, { minRole: "admin" })` membatasi informasi operasional kepada administrator dan pemilik. Peran lain atau tidak dikenal tidak membuat DOM toast, timer, atau callback penutupan. Tanpa `minRole`, umpan balik biasa tetap terlihat oleh semua pengguna. Opsi tampilan ini bukan otorisasi operasi server.

Menu mengambang memakai kapabilitas `ui:floatingMenus` versi 1 dan alur bertahap `ui:floatingMenu:request`, `present`, `dismiss`, serta `release`. Prioritas sama mengikuti urutan permintaan; prioritas lebih tinggi menangguhkan menu di bawahnya. Reservasi menyediakan `ready` untuk izin pertama atau pembatalan, `present(element, { visible })`, `dismiss(element)`, dan `dispose()`. Tutorial menahan prioritas 100 sampai selesai, dibatalkan, atau pemilik dilepas, termasuk di antara langkah. Slot komposer dan pemilih pemutaran ulang memakai antrean yang sama. Permintaan batal dan tampilan lama tidak dapat menggantikan menu baru; slot kosong mengalah, dan pelepasan halaman membersihkan observer serta reservasi.
