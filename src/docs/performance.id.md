# Anggaran kinerja

Trafik produksi berakhir di proxy edge `cognis-web` yang dibangun dari `docker/edge` dan diterbitkan oleh GitLab CI sebagai `$CI_REGISTRY_IMAGE/cognis-web`. Secara default, `COGNIS_EDGE_TLS_MODE=terminate` mengaktifkan listener HTTPS lokal dan membutuhkan sertifikat TLS sebagai `docker/tls/fullchain.pem` serta kunci sebagai `docker/tls/privkey.pem`. Gunakan `COGNIS_EDGE_TLS_MODE=deferred` hanya di belakang terminator TLS hulu yang tepercaya; Nginx kemudian hanya mendengarkan HTTP, mempertahankan kebijakan cache yang sama, dan meneruskan header protokol hulu tepercaya jika tersedia. CDN terkelola dapat menerapkan kebijakan cache dan penerusan yang sama. Hanya edge yang dipublikasikan sehingga penggantian header penerusan olehnya menetapkan batas kepercayaan.

## Protokol baseline hosted

Jalankan tiga sampel Lighthouse terhadap rilis hosted dan simpan artefak median di CI: pemuatan dingin dengan profil kosong, pemuatan hangat setelah satu kunjungan awal, dan navigasi SPA dari Dasbor ke Pengaturan. Emulasikan round trip 150 ms, downstream 1,6 Mbps, upstream 750 Kbps, dan perlambatan CPU 4x. Catat SHA rilis, region, versi peramban, keadaan dingin/hangat, jumlah request, byte terkompresi, LCP, durasi pemasangan route, dan p95 API.

## Anggaran

| Perjalanan      | Request | Transfer terkompresi |      LCP | p95 API |
| --------------- | ------: | -------------------: | -------: | ------: |
| Pemuatan dingin |      45 |              500 KiB | 2.500 ms |  400 ms |
| Pemuatan hangat |      15 |              150 KiB | 1.800 ms |  300 ms |
| Navigasi SPA    |      10 |              100 KiB | 1.500 ms |  250 ms |

Optimasi hanya diterima setelah protokol hosted yang sama menunjukkan tidak ada regresi anggaran terhadap baseline tersimpan. Selidiki kueri basis data, payload, kebijakan cache, dan pekerjaan aplikasi terlebih dahulu. Tambahkan Redis hanya jika pengukuran ini membuktikan bottleneck cache persisten yang tidak dapat diatasi cache dalam proses dan edge.
