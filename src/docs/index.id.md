# Indeks Dokumentasi Cognis

## Ikhtisar

Ini adalah dokumen navigasi root untuk dokumentasi pengembang Cognis. Semua dokumen dalam set ini disajikan melalui browser dokumentasi dalam aplikasi di `/docs` dan melalui `GET /api/v1/docs`.

Dokumen-dokumen ini ditulis untuk kontributor pengembang, bukan pengguna akhir. Jika Anda baru mengenal kodebase, mulailah dengan dokumen Ikhtisar dan Fitur Platform.

## Daftar Isi

### Platform

| Dokumen                                 | Keterangan                                              |
| --------------------------------------- | ------------------------------------------------------- |
| [Ikhtisar](./overview.en.md)            | Apa itu Cognis dan bagaimana lapisan-lapisannya bersatu |
| [Fitur Platform](./features.id.md)      | Kemampuan bawaan dan cakupan adapter                    |
| [Standar Dokumentasi](./standard.en.md) | Cara penulisan dan pengorganisasian dokumentasi         |
| [Matriks ACL](./acl-matrix.id.md)       | Definisi peran dan matriks izin lengkap                 |
| [Versi Komponen](./versions.id.md)      | Versi terkini setiap gateway, adapter, dan modul        |

### Lapisan Arsitektur

| Dokumen                     | Keterangan                                                      |
| --------------------------- | --------------------------------------------------------------- |
| [Inti](./core.en.md)        | Kontrak, antarmuka, dan layanan kebijakan                       |
| [API](./api.id.md)          | Server HTTP, grup route, model autentikasi                      |
| [UI](./ui.id.md)            | Frontend browser: halaman, layout, i18n                         |
| [Adapter](./adapters.id.md) | Ikhtisar lapisan adapter platform                               |
| [Gateway](./gateways.id.md) | Cara membuat gateway dan adapter; urutan boot; capability store |
| [DevOps](./devops.id.md)    | Dockerfile, GitHub Actions, referensi variabel environment      |

### Gateway

| Dokumen                                                   | Keterangan                                |
| --------------------------------------------------------- | ----------------------------------------- |
| [Gateway Autentikasi](../gateways/auth/docs/index.id.md)  | Penyedia autentikasi, penerbitan token    |
| [Gateway Database](../gateways/db/docs/index.id.md)       | Akses database, executor, helper dialek   |
| [Gateway File](../gateways/files/docs/index.id.md)        | Capability penyimpanan file lokal         |
| [Gateway Logging](../gateways/logging/docs/index.id.md)   | Logging terstruktur                       |
| [Gateway Notifikasi](../gateways/notify/docs/index.id.md) | Pengiriman notifikasi yang dapat dipasang |
| [Gateway Sosial](../gateways/social/docs/standard.en.md)  | Profil, grafik sosial, postingan, pesan   |
