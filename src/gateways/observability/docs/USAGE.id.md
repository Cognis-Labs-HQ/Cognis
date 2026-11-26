# Penggunaan

Prosedur praktis untuk Pemantauan Kinerja.

## Prasyarat

Operator perlu akses ke tujuan metrik; tujuan bawaan menulis log debug.

## Contoh

Aktifkan log debug yang sesuai, reproduksi permintaan lambat, lalu bandingkan waktu HTTP atau basis data pada kondisi sama.

Selesaikan `observability:metrics` melalui `ctx.capabilities` untuk metrik server, atau kirim telemetri browser yang diizinkan melalui endpoint gateway.

## Hasil yang Diharapkan

Pengukuran diizinkan mencapai kapabilitas metrik; sampel peramban tidak mencakup setiap kunjungan.

## Pemecahan Masalah

Periksa tingkat log dan sampling. Gateway bawaan tidak menyediakan dasbor metrik tersendiri.
