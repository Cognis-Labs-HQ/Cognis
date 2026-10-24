# Anggaran kinerja

Trafik produksi melewati image generik `nginx:stable-alpine` dengan `docker/cognis-web/default.conf.template` yang dipasang. Templat mengatur cache HTTP dan header proksi melalui substitusi lingkungan native nginx. TLS sengaja dimiliki oleh penerapan: pasang konfigurasi TLS nginx native tambahan, gunakan ingress Kubernetes, atau hentikan TLS pada proksi eksternal maupun CDN.

## Protokol baseline hosted

Jalankan tiga sampel Lighthouse terhadap rilis hosted dan simpan artefak median di CI: pemuatan dingin dengan profil kosong, pemuatan hangat setelah satu kunjungan awal, dan navigasi SPA dari Dasbor ke Pengaturan. Emulasikan round trip 150 ms, downstream 1,6 Mbps, upstream 750 Kbps, dan perlambatan CPU 4x. Catat SHA rilis, region, versi peramban, keadaan dingin/hangat, jumlah request, byte terkompresi, LCP, durasi pemasangan route, dan p95 API.

## Anggaran

| Perjalanan      | Request | Transfer terkompresi |      LCP | p95 API |
| --------------- | ------: | -------------------: | -------: | ------: |
| Pemuatan dingin |      45 |              500 KiB | 2.500 ms |  400 ms |
| Pemuatan hangat |      15 |              150 KiB | 1.800 ms |  300 ms |
| Navigasi SPA    |      10 |              100 KiB | 1.500 ms |  250 ms |

Optimasi hanya diterima setelah protokol hosted yang sama menunjukkan tidak ada regresi anggaran terhadap baseline tersimpan. Selidiki kueri basis data, payload, kebijakan cache, dan pekerjaan aplikasi terlebih dahulu. Tambahkan Redis hanya jika pengukuran ini membuktikan bottleneck cache persisten yang tidak dapat diatasi cache dalam proses dan web.

## Resolusi aset produksi

Hanya URL skrip yang dideklarasikan dan pendaftaran bilah navigasi langsung yang menjadi titik masuk wajib; impor statis biasa tetap menjadi dependensi dalam bundel. Build UI menerbitkan kontribusi JavaScript host yang dideklarasikan sebagai titik masuk meskipun titik masuk lain juga mengimpornya. Direktori statis gateway dan adapter yang terdaftar memetakan deskriptornya ke aset sumber hasil build yang sesuai, sehingga prefiks URL khusus dapat memakai bundel produksi. Bagian pengaturan yang ditambahkan oleh alur konstruksi diresolusikan melalui manifes yang sama setelah pemeriksaan otorisasi dan visibilitas. Setiap permintaan memakai deskriptor terkini; sumber yang tidak dibundel dan sumber modul dengan revisi mempertahankan URL resminya.

Resolusi memakai manifes build yang tersedia dan tidak menyimpan respons API dalam cache. Autentikasi dan penyaringan komponen aktif tetap dijalankan saat deskriptor diminta. Instalasi yang hanya memakai sumber, aset yang tidak dibangun, direktori eksternal, dan URL modul dengan revisi tetap memakai jalur pengiriman aslinya.

Hanya katalog yang diperlukan sebelum pemasangan halaman yang mengaktifkan pramuat. Katalog bilah navigasi tetap mengunduh sesuai kebutuhan agar penemuan latar belakang tidak memicu banyak permintaan bersamaan saat navigasi. Setelah penemuan terautentikasi, pemuat penyedia melakukan pramuat URL bundel host yang tidak berubah sambil mempertahankan urutan impor dan pemasangan. Tautan pramuat dihapus setelah selesai atau gagal. Penyedia aktif tidak dipramuat ulang; URL modul eksternal, sumber, dan URL dengan revisi tetap memakai jalur impor yang ada.

## Navigasi Tetap Terlihat

Pemuatan rute menutupi ruang kerja yang terdampak sementara bagian kepala dan navigasi tetap terlihat. Pemuatan dokumen langsung tetap memakai tampilan pemuatan seluruh halaman. Navigasi yang digantikan segera melepaskan token pemuatannya; konten tertunda dan galat tetap ditampilkan melalui tampilan pemuatan dan galat yang tersedia.

Setiap penyusunan antarmuka mengambil preferensi terkini satu kali untuk kontrol tema dan bahasa serta menjadwalkan satu pembaruan avatar setelah penyedia siap. Elemen avatar yang tidak berubah dipertahankan. Hasil terlambat ditolak setelah akun, token, penyedia, atau pembaruan berubah. Tidak ada cache respons pribadi baru.

Ukur awal navigasi, waktu indikator terlihat, dan kesiapan konten wajib secara terpisah, termasuk kunjungan berulang serta Kembali/Maju. Catat identitas dokumen, kerangka antarmuka, avatar, dan urutan permintaan. Pemasangan selesai atau widget awal yang kosong bukan bukti kesiapan konten. Pengukuran sintetis lokal tidak membuktikan kinerja layanan yang dihosting.
