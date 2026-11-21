# Referensi Teknis

Antarmuka publik dan aturan operasional Pendaftaran.

## Antarmuka

`GET /api/v1/registration/state`

`GET /api/v1/registration/policy`

`PUT /api/v1/registration/policy`

`POST /api/v1/registration/invite`

`POST /api/v1/registration/redeem`

`GET /api/v1/registration/tokens`

`POST /api/v1/registration/tokens`

## Konfigurasi

Kebijakan undangan dan penyedia aktif menentukan siapa yang boleh membuat akun serta undangan. Token dan keadaan pendaftaran disimpan melalui gerbang basis data.

## Perilaku

Kontribusi CLI `invite:create`, `invite:list`, dan `invite:state` memanggil operasi HTTP yang dideklarasikan. Penukaran undangan memvalidasi token dan kebijakan sebelum pembuatan akun.

## Keamanan

Keadaan memerlukan akun masuk. Administrasi kebijakan memerlukan akses administratif; penerbitan dan daftar undangan mengikuti kebijakan terkini. Identitas eksternal tertahan tetap dimiliki server.

## Referensi

### Spesifikasi Teknis

| Halaman / bagian                    | Panduan               | Akses          |
| ----------------------------------- | --------------------- | -------------- |
| `/invite`                           | Panduan Undangan      | Pengguna masuk |
| `/administration` · `#registration` | Kebijakan Pendaftaran | Administrator  |

Perilaku ini dijelaskan dalam [kontrak bersama](/docs/adapters/social/messages/technical).
