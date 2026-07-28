# Memperkuat berbagi dan kepemilikan rahasia

## Memindahkan rahasia terenkripsi ke adapter keyring autentikasi wajib

Klien keyring, penyimpanan persisten, dan rute API kini dimiliki adapter Autentikasi wajib. Migrasi preferensi lama dan pengambilan kunci ruang obrolan dalam teks biasa telah dihapus, sehingga konsumen rahasia hanya menyelesaikan kunci melalui keyring terenkripsi.

## Menjaga tanggung jawab berbagi di adapter pemiliknya

Adapter Berbagi Pengguna kini memastikan penerima unik, sedangkan SMTP sendiri mengelola pembatasan laju antrean email. Gateway Berbagi hanya mengorkestrasi kebijakan milik adapter tersebut.

## Menyelaraskan bootstrap keyring dengan arsitektur kapabilitas

Keyring peramban yang dapat digunakan kembali tetap berada di permukaan UI kanonisnya. Adapter Autentikasi wajib kini memulai sendiri kapabilitas brankas dan rutenya selama penemuan gateway, menerima autentikasi melalui injeksi konteks rute, dan menyertakan dokumentasi milik komponen.

## Memulihkan kepatuhan ukuran sumber dan dependensi

Berkas rute dan pengujian Kalender yang besar telah dipecah menjadi modul terfokus, berkas tersentuh yang terlalu besar kini berada di bawah batas 1.000 baris, dan batas atas dependensi Berbagi sesuai dengan versi workspace yang diuji.
