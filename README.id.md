# Cognis

Cognis adalah platform pembelajaran bahasa modular berbasis API-first dengan fitur jejaring sosial yang ringan.

## Struktur saat ini

- `core/`: kontrak, antarmuka gateway, dan layanan inti.
- `api/`: kerangka rute `/api/v1` yang mengekspresikan tujuan domain dan endpoint dokumentasi.
- `adapters/`: implementasi gateway khusus backend.
- `ui/`: aplikasi frontend untuk belajar, dokumentasi, administrasi, dan pengaturan pengguna.
- `modules/`: root modul compile-time.
- `tooling/cli/`: utilitas placeholder `cognisctl`.
- `docs/components/`: dokumentasi komponen terpusat yang dapat diakses UI melalui API.

## Prinsip desain

Handler API mendefinisikan **apa** yang harus dilakukan. Gateway/adapter menentukan **bagaimana** perilaku khusus backend dijalankan.

## CI/CD

- GitHub Actions:
    - Tes CI pada push/pull request.
    - Build+push Docker saat rilis dipublikasikan atau dispatch manual ke `ghcr.io/<owner>/cognis`.
- GitLab CI:
    - Tes pada commit branch dan tag.
    - Build+push Docker pada tag atau run manual ke `registry.gitlab.firehawk-systems.com/firehawk/cognis`.

## Orkestrasi container

- `docker-compose.postgres.yaml` dan `docker-compose.mariadb.yaml`: profil produksi untuk PostgreSQL dan MariaDB.
- `docker-compose.postgres.dev.yaml` dan `docker-compose.mariadb.dev.yaml`: profil pengembangan/demo dengan bind mount untuk perubahan UI/API yang sedang berjalan.

## Panduan AI

- Pengingat kontribusi khusus AI dipisahkan di `AI_GUIDELINES.md` (terpisah dari dokumen produk/pengguna).

## CLI

- Gunakan `tooling/cli/src/index.ts` (`cognisctl`) sebagai titik kendali operasional.
- Konfigurasikan target API dengan `COGNIS_API_URL` (default `http://localhost:3000`).
- Kontrol siklus hidup pengguna diberi namespace `user:*` (termasuk `user:preferences:clear`).
- Modul dapat menyediakan subcommand melalui `modules/<moduleId>/cli/index.js`.
- Di shell image Docker, `cognisctl` tersedia langsung di PATH.
