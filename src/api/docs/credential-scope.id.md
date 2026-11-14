# Penerimaan Rute Terbatas

Pemeriksaan akun hanya menerima kredensial sesi. Rute sumber daya campuran mengambil `share:getGuestClaims(request)` secara eksplisit, lalu memeriksa izin sumber daya dan tindakan. Penerimaan tamu yang tidak ada atau tidak valid hanya dapat dilanjutkan dengan autentikasi akun biasa, bukan otorisasi akun memakai klaim tamu. Rute modul yang memeriksa seluruh akses di penangannya menghilangkan metadata peran akun luar; rute administrasi mempertahankannya. Hanya penemuan penyedia dan rute aplikasi yang menerima kredensial tamu aktif untuk perenderan, dengan filter visibilitas peran yang sudah ada. Endpoint identitas tanpa cache hanya mengembalikan subjek, peran, penyedia, tujuan, dan status penyiapan yang terverifikasi.

## Penggunaan

`await ctx.getCapability("share:getGuestClaims")(request)`

## Kontrak

`Promise<{ sub: string; role: "user"; providerId: string; purpose: "share"; setupPending: false } | null>`
