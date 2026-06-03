# Item Umpan Balik Ditunda

## Tinjauan kode — loop pemuatan navigasi ringkas

### dashboard-layout-menu.test.js stabilitas navigasi ringkas — tambahkan uji runtime observer

**Saran peninjau:** Ganti asersi berbasis source untuk guard navigasi ringkas dengan uji runtime yang memicu observer berulang kali dan memverifikasi bahwa navigasi tetap stabil tanpa masuk ke loop.

**Alasan ditunda:** Harness pengujian UI saat ini di repositori ini untuk `dashboard-layout.js` berfokus pada source dan fixture, dan belum menyediakan pemuat DOM/runtime ringan untuk menjalankan `applyCompactNav()` secara langsung tanpa perubahan infrastruktur pengujian yang lebih luas. Saya mempertahankan asersi regresi berbasis source yang terarah dalam perbaikan ini dan menunda pekerjaan harness runtime yang lebih berat ke tindak lanjut agar perbaikan loop pemuatan itu sendiri bisa dikirim segera.

### messages/ui/app.js JSDoc wrapComposerSelection — jelaskan perilaku saat ada seleksi vs. kursor

**Saran peninjau:** Tambahkan deskripsi JSDoc yang lebih rinci untuk menjelaskan bagaimana `wrapComposerSelection()` berperilaku saat teks dipilih dibandingkan saat kursor dalam keadaan terlipat.

**Alasan ditunda:** Umpan balik ini menargetkan `src/adapters/social/messages/ui/`, yang berada di luar permukaan regresi navigasi ringkas. Berdasarkan aturan versioning repositori, menyentuh adapter itu akan memerlukan pembaruan versi adapter dan changelog yang tidak terkait untuk tindak lanjut dokumentasi saja, jadi saya membiarkannya tidak berubah dalam perbaikan ini.

### messages/ui/app.js jalur penyisipan templat — deduplikasi logika applyTemplateToComposer

**Saran peninjau:** Gunakan helper `applyTemplateToComposer` yang sudah ada untuk jalur penyisipan templat di sekitar baris 3288-3291 alih-alih mengulang logika pembaruan composer yang sama.

**Alasan ditunda:** Ini adalah refaktor lokal adapter di `src/adapters/social/messages/ui/` yang tidak memengaruhi regresi loop pemuatan navigasi ringkas yang sedang diperbaiki di sini. Mengambilnya dalam patch ini akan memperluas cakupan ke cleanup adapter messages yang terpisah dan memicu pekerjaan versioning/changelog yang tidak terkait, jadi saya menundanya untuk tindak lanjut khusus.
