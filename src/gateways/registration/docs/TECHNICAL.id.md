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

Penukaran undangan menggunakan POST /api/v1/registration/redeem dengan objek JSON berisi token, username, password, serta email dan displayName opsional. Gateway meneruskan seluruh masukan ke penyedia undangan. Penyedia tersebut menangani validasi token, pembuatan akun, dan penyimpanan penukaran; kegagalannya diteruskan ke penanganan kesalahan rute. Registrasi publik menggunakan registration:public:isEnabled untuk ketersediaan dan registration:public:register untuk eksekusi. Gateway yang dinonaktifkan menolak eksekusi dengan gateway_disabled; penyedia publik yang tidak tersedia menolaknya dengan public_disabled. Ketersediaan diperiksa saat eksekusi. Bootstrap mendaftarkan kapabilitas tersebut dan memperluas alur gateAccountCreation serta constructRegistrationUi yang ada melalui ctx. Pemanggil menggunakan antarmuka ini alih-alih mengimpor adapter konkret.

## Keamanan

Keadaan memerlukan akun masuk. Administrasi kebijakan memerlukan akses administratif; penerbitan dan daftar undangan mengikuti kebijakan terkini. Identitas eksternal tertahan tetap dimiliki server.

## Referensi

### Spesifikasi Teknis

| Halaman / bagian                    | Panduan               | Akses          |
| ----------------------------------- | --------------------- | -------------- |
| `/invite`                           | Panduan Undangan      | Pengguna masuk |
| `/administration` · `#registration` | Kebijakan Pendaftaran | Administrator  |

Perilaku ini dijelaskan dalam [kontrak bersama](/docs/adapters/social/messages/technical).
