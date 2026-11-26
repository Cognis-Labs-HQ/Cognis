# Referensi Teknis

Antarmuka publik dan aturan operasional Kelas.

## Antarmuka

`GET /api/v1/study/classes`

`GET /api/v1/study/my-classes`

`GET /api/v1/study/available-classes`

`GET /api/v1/study/preferences`

`PUT /api/v1/study/preferences`

`POST /api/v1/study/teacher-requests`

`GET /api/v1/study/teacher-requests`

`POST /api/v1/study/teacher-requests/:id/approve`

`POST /api/v1/study/teacher-requests/:id/reject`

`POST /api/v1/study/classes/:classId/join`

`DELETE /api/v1/study/classes/:classId/membership`

`GET /api/v1/study/classrooms`

`PATCH /api/v1/study/classrooms/:classId/layout`

`DELETE /api/v1/study/classrooms/:classId/students/:studentId`

`GET /api/v1/study/classes/:classId/members`

`GET /api/v1/study/classes/:classId/join-requests`

`POST /api/v1/study/classes/:classId/invite`

`POST /api/v1/study/classes/:classId/join-requests/:studentId/approve`

`POST /api/v1/study/classes/:classId/join-requests/:studentId/reject`

## Konfigurasi

Bahasa belajar, kelayakan guru, keanggotaan kelas, dan batas ruang dikonfigurasi melalui Study dan Kelas. Adaptor ini tidak memiliki pengaturan koneksi basis data terpisah.

## Perilaku

Guru mengelola kelas dan keputusan keanggotaannya. Pelajar menelusuri kelas tersedia, meminta keanggotaan, dan memakai ruang kelas terdaftar. Keadaan disimpan melalui gerbang basis data.

## Keamanan

Autentikasi, kepemilikan, dan keanggotaan kelas diperiksa setiap operasi. Persetujuan administratif diperlukan sesuai kebijakan guru atau keanggotaan.

## Referensi

### Spesifikasi Teknis

| Halaman / bagian           | Panduan       | Akses          |
| -------------------------- | ------------- | -------------- |
| `/classes` · `#class-list` | Panduan Kelas | Pengguna masuk |
| `/my-classes`              | Kelas Saya    | Pengguna masuk |

Perilaku ini dijelaskan dalam [kontrak bersama](/docs/adapters/social/messages/technical).
