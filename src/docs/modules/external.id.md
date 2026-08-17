# Modul Eksternal

## Identitas stabil

Setiap modul memiliki ID yang mudah dibaca dan UUID yang tidak boleh berubah. Semua entri dependensi `requires` memakai UUID.

## Kontrak repositori

Satu repositori Git menyediakan satu modul. Akar repositori memuat `manifest.json`, `package.json`, `routes.json`, serta `bootstrap.js`, `api/index.js`, `ui/index.js`, dan `cli/index.js` bila diperlukan. Hanya `bootstrap.js` yang menghubungkan modul melalui `ctx`; berkas internal bebas diatur. Manifes menjelaskan metadata, kategori, kemampuan, lisensi, dependensi UUID, serta jalur relatif avatar dan tangkapan layar.

## Sumber dan keamanan

Pengelola modul pada menu pengguna menemukan repositori dalam organisasi GitHub dan grup GitLab. PAT baca-saja yang opsional disimpan di keyring administrator; konfigurasi sumber hanya menyimpan pengenalnya. Instalasi mengklon melalui HTTPS, memvalidasi manifes dan UUID, lalu memindahkan isi secara atomik. Kode baru berjalan setelah diaktifkan secara terpisah. Tinjau kode pihak ketiga sebelum mengaktifkannya.

## Aset toko dan tag

Modul dapat mendeklarasikan `tags` yang lebih khusus di samping `categories`; keduanya digunakan untuk penyaringan. Gambar toko berada di `assets/` pada repositori: gunakan `assets/icon.svg` atau `assets/icon.png` sebagai ikon katalog, serta `assets/banner.svg`, `assets/banner.png`, atau `assets/banner.jpg` sebagai gambar utama halaman detail. Nyatakan jalur tersebut sebagai `assets.icon` dan `assets.banner` dalam `manifest.json`. Gambar galeri opsional dicantumkan dalam `assets.screenshots`.
