# Kinerja produksi dan observabilitas

**Feature Branch:** feature-configure-production-reverse-proxy-and-observability

## Web produksi aman dan sadar cache

Web TLS HTTP/2 menyediakan penggunaan ulang koneksi, kompresi Brotli/gzip, cache aset hash immutable, validasi ulang HTML, header proxy tepercaya, dan respons API privat. `cognis-web` dapat berjalan hanya dengan HTTP melalui `COGNIS_WEB_TLS_MODE=deferred` ketika TLS diterminasi di hulu. Penyiapan menulis mode dan path sertifikat yang dapat dikonfigurasi ke file env web terisolasi; karena itu `cognis-web` tidak dapat membaca kunci enkripsi Cognis atau kredensial basis data. Compose menunggu healthcheck basis data dan Cognis. Penyegaran rute modul kini menginisialisasi sumber daya runtime Nextcloud Whiteboard hanya sekali, observability secara eksplisit menyatakan tidak memiliki adapter, dan pengaturan keamanan yang tersimpan tetap terlihat selama metadata komponen dimuat ulang alih-alih menampilkan nilai default kosong.

Origin mode tertunda kini terikat ke loopback secara bawaan, sedangkan TLS yang diakhiri secara lokal terikat secara publik. Penyiapan menyediakan sertifikat awal yang ditandatangani sendiri, dan aset ber-hash memakai seluruh alfabet hash esbuild.

## Telemetri kinerja netral-vendor

Pengukuran server, basis data, cache, event loop, Web Vitals, transfer, dan pemasangan SPA berbasis ctx memakai label terbatas dan sampling. Timing DB kini mempertahankan permukaan executor mentah yang dipakai saat inisialisasi skema, dan kegagalan bootstrap gateway wajib kini langsung melaporkan akar penyebabnya alih-alih kemudian muncul sebagai dependensi yang hilang.

Pengiriman kinerja peramban kini memerlukan sesi terautentikasi, menerapkan batas per akun, membatasi ukuran kumpulan metrik, mempertahankan metrik dokumen saat navigasi SPA, dan menghitung CLS memakai jendela sesi Web Vitals.

## Anggaran kinerja terukur

Baseline hosted untuk pemuatan dingin, hangat, dan navigasi SPA beserta anggaran yang harus dinilai sebelum Redis kini terdokumentasi.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/226e1ff10bbf99756a045f037c636181e130d318
