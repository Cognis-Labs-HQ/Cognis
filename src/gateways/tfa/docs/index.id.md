# Gateway TFA

## Tujuan

Mengelola metode autentikasi dua faktor, verifikasi login, kode pemulihan, dan status penegakan.

## Tanggung Jawab

- Menemukan dan memuat adaptor TFA dari `src/adapters/tfa/*`.
- Menyediakan endpoint untuk setup, aktif/nonaktif, dan preferensi metode.
- Menangani verifikasi tantangan login melalui metode yang dikonfigurasi.
- Membuat kode pemulihan dan melacak status pemakaiannya.
- Menyediakan status penegakan agar UI dapat mewajibkan setup.

## Permukaan API Utama

- `GET /api/v1/tfa/methods`
- `POST /api/v1/tfa/methods/:id/setup/begin`
- `POST /api/v1/tfa/methods/:id/setup/verify`
- `POST /api/v1/tfa/methods/:id/setup/cancel`
- `POST /api/v1/tfa/methods/:id/enable`
- `POST /api/v1/tfa/methods/:id/disable`
- `PUT /api/v1/tfa/methods/preferences`
- `GET /api/v1/tfa/recovery-codes`
- `POST /api/v1/tfa/recovery-codes/rotate`
- `GET /api/v1/tfa/status`
