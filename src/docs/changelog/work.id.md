# Memperkuat berbagi dan kepemilikan rahasia

## Memindahkan rahasia terenkripsi ke adapter keyring autentikasi wajib

Klien keyring, penyimpanan persisten, dan rute API kini dimiliki adapter Autentikasi wajib. Migrasi preferensi lama dan pengambilan kunci ruang obrolan dalam teks biasa telah dihapus, sehingga konsumen rahasia hanya menyelesaikan kunci melalui keyring terenkripsi.

## Menjaga tanggung jawab berbagi di adapter pemiliknya

Adapter Berbagi Pengguna kini memastikan penerima unik, sedangkan SMTP sendiri mengelola pembatasan laju antrean email. Gateway Berbagi hanya mengorkestrasi kebijakan milik adapter tersebut.
