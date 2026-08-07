# Anggaran kinerja

Trafik produksi berakhir di proksi `cognis-web`. Proksi selalu mendengarkan HTTP dan mengaktifkan HTTPS beserta pengalihan HTTP ke HTTPS secara oportunistik ketika kedua file sertifikat TLS yang dikonfigurasi tersedia dan dapat dibaca. Tanpa sertifikat yang dapat digunakan, proksi tetap hanya menggunakan HTTP untuk pengoperasian di belakang proksi balik atau CDN. Kebijakan cache yang sama berlaku dalam kedua keadaan.

## Protokol baseline hosted

Jalankan tiga sampel Lighthouse terhadap rilis hosted dan simpan artefak median di CI: pemuatan dingin dengan profil kosong, pemuatan hangat setelah satu kunjungan awal, dan navigasi SPA dari Dasbor ke Pengaturan. Emulasikan round trip 150 ms, downstream 1,6 Mbps, upstream 750 Kbps, dan perlambatan CPU 4x. Catat SHA rilis, region, versi peramban, keadaan dingin/hangat, jumlah request, byte terkompresi, LCP, durasi pemasangan route, dan p95 API.

## Anggaran

| Perjalanan      | Request | Transfer terkompresi |      LCP | p95 API |
| --------------- | ------: | -------------------: | -------: | ------: |
| Pemuatan dingin |      45 |              500 KiB | 2.500 ms |  400 ms |
| Pemuatan hangat |      15 |              150 KiB | 1.800 ms |  300 ms |
| Navigasi SPA    |      10 |              100 KiB | 1.500 ms |  250 ms |

Optimasi hanya diterima setelah protokol hosted yang sama menunjukkan tidak ada regresi anggaran terhadap baseline tersimpan. Selidiki kueri basis data, payload, kebijakan cache, dan pekerjaan aplikasi terlebih dahulu. Tambahkan Redis hanya jika pengukuran ini membuktikan bottleneck cache persisten yang tidak dapat diatasi cache dalam proses dan web.
