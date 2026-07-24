# Konvensi utilitas pencarian

Kode pencarian UI bersama berada di `src/ui/reuse/search-util/` dan tetap diekspor ulang melalui `src/ui/reuse/search-bar.js` untuk kompatibilitas.

Komponen yang menyumbang konten pencarian harus menaruh integrasi pencarian di file khusus `ui/search/index.js`. Ekspor provider bernama `createSearchIndex` untuk konten komponen dan helper pendaftaran bernama `registerSearchIndex` saat komponen mengelola siklus hidupnya sendiri. Provider mengembalikan grup atau item yang sudah dinormalisasi, sementara utilitas bersama menangani pencocokan kueri, peringkat, sorotan, filter, rendering, dan pengabaian hasil async yang sudah usang.

Gunakan tahap alur pencarian CTX untuk kategori luas: `visible-indexes` untuk halaman dan navigasi yang terlihat, `component-indexes` untuk data milik komponen, dan `settings-index` untuk pengaturan serta preferensi. Pekerjaan mahal seperti mengambil pesan, posting, dokumen, atau acara kalender harus tetap async di provider agar popup dapat menerima hasil saat tiap sumber selesai.

Konten DOM yang dapat dicari sebaiknya memakai `data-search-label`, `data-search-text`, `data-search-category`, dan `data-search-result-class`. Untuk komponen baru, hindari nama file ad hoc atau fungsi pencarian yang tersebar di file yang tidak terkait.
