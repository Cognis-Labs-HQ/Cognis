# Referensi Teknis

Antarmuka publik dan aturan operasional Cognis.

## Antarmuka

### Lapisan Arsitektur

| Dokumen                   | Keterangan                                                      |
| ------------------------- | --------------------------------------------------------------- |
| [Inti](/docs/core)        | Kontrak, antarmuka, dan layanan kebijakan                       |
| [API](/docs/api)          | Server HTTP, grup route, model autentikasi                      |
| [UI](/docs/ui)            | Frontend browser: halaman, layout, i18n                         |
| [Adapter](/docs/adapters) | Ikhtisar lapisan adapter platform                               |
| [Gateway](/docs/gateways) | Cara membuat gateway dan adapter; urutan boot; capability store |
| [DevOps](/docs/devops)    | Dockerfile, GitHub Actions, referensi variabel environment      |

## Konfigurasi

Topik dokumentasi ini tidak memiliki konfigurasi waktu jalan sendiri. Pengaturan operasional dimiliki komponen terkait.

## Perilaku

### Ikhtisar

Ini adalah dokumen navigasi root untuk dokumentasi pengembang Cognis. Semua dokumen dalam set ini disajikan melalui browser dokumentasi dalam aplikasi di `/docs` dan melalui `GET /api/v1/docs`.

Dokumen-dokumen ini ditulis untuk kontributor pengembang, bukan pengguna akhir. Jika Anda baru mengenal kodebase, mulailah dengan dokumen Ikhtisar dan Fitur Platform.

### Platform

| Dokumen                               | Keterangan                                              |
| ------------------------------------- | ------------------------------------------------------- |
| [Ikhtisar](/docs/overview)            | Apa itu Cognis dan bagaimana lapisan-lapisannya bersatu |
| [Fitur Platform](/docs/features)      | Kemampuan bawaan dan cakupan adapter                    |
| [Standar Dokumentasi](/docs/standard) | Cara penulisan dan pengorganisasian dokumentasi         |
| [Matriks ACL](/docs/acl-matrix)       | Definisi peran dan matriks izin lengkap                 |
| [Versi Komponen](/docs/versions)      | Versi terkini setiap gateway, adapter, dan modul        |

### Gateway

| Dokumen                                           | Keterangan                                |
| ------------------------------------------------- | ----------------------------------------- |
| [Gateway Autentikasi](/docs/gateways/auth)        | Penyedia autentikasi, penerbitan token    |
| [Gateway Database](/docs/gateways/db)             | Akses database, executor, helper dialek   |
| [Gateway File](/docs/gateways/files)              | Capability penyimpanan file lokal         |
| [Gateway Logging](/docs/gateways/logging)         | Logging terstruktur                       |
| [Gateway Notifikasi](/docs/gateways/notify)       | Pengiriman notifikasi yang dapat dipasang |
| [Gateway Sosial](/docs/gateways/social/technical) | Profil, grafik sosial, postingan, pesan   |

## Keamanan

Membaca dokumentasi tidak memberikan izin menjalankan contohnya. Komponen pemilik mengotorisasi setiap operasi.

## Referensi

Kode sumber dan metadata paket: `./`.
