# Gateway observabilitas

Gateway menyediakan kapabilitas ctx netral-vendor `observability:metrics` dan endpoint telemetri peramban tersampel yang dibatasi ukurannya. Nama metrik dan label dibatasi dengan daftar izin agar kardinalitas tetap terkendali. Tujuan metrik dapat diganti tanpa mengikat route atau gateway ke vendor telemetri.

## Contoh penggunaan

Selesaikan `observability:metrics` melalui `ctx.capabilities` untuk metrik server, atau kirim telemetri browser yang diizinkan melalui endpoint gateway.

## Spesifikasi teknis

Nama metrik dan label menggunakan daftar izin, payload browser diambil sampelnya dan dibatasi ukurannya, serta sink tetap netral vendor dan dapat diganti melalui kontrak kapabilitas.
