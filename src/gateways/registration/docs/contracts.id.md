# Kontrak Registrasi

Gateway registrasi mengelola pendaftaran publik dan penukaran undangan serta menyediakan operasi penyedia melalui kapabilitas dan rute gateway.

## Contoh Penggunaan

Pemanggil pendaftaran publik memperoleh kapabilitas terdaftar. Hasilnya memuat username, enabled, dan peran dari penyedia:

```js
const register = ctx.capabilities.require("registration:public:register");
const account = await register({ username, password, email, displayName });
```

## Spesifikasi Teknis

Penukaran undangan menggunakan POST /api/v1/registration/redeem dengan objek JSON berisi token, username, password, serta email dan displayName opsional. Gateway meneruskan seluruh masukan ke penyedia undangan. Penyedia tersebut menangani validasi token, pembuatan akun, dan penyimpanan penukaran; kegagalannya diteruskan ke penanganan kesalahan rute. Registrasi publik menggunakan registration:public:isEnabled untuk ketersediaan dan registration:public:register untuk eksekusi. Gateway yang dinonaktifkan menolak eksekusi dengan gateway_disabled; penyedia publik yang tidak tersedia menolaknya dengan public_disabled. Ketersediaan diperiksa saat eksekusi. Bootstrap mendaftarkan kapabilitas tersebut dan memperluas alur gateAccountCreation serta constructRegistrationUi yang ada melalui ctx. Pemanggil menggunakan antarmuka ini alih-alih mengimpor adapter konkret.

## Penyelesaian Terbatas

verifyToken hanya berisi otoritas onboarding; onboardingOperations mencantumkan ID terdaftar. Peramban menyimpan kredensial dalam alur pendaftaran dan mencabutnya sebelum kembali ke login. Pengiriman berulang memakai percobaan aktif yang sama. Respons setelah halaman ditinggalkan dibersihkan tanpa menjalankan ekstensi atau navigasi. Kegagalan pencabutan tidak ditampilkan sebagai keberhasilan. Jika akun telah dibuat tetapi penerbitan kredensial gagal, accountCreated memungkinkan pemulihan melalui login; penukaran undangan dan penyimpanan token tidak atomik.

Ekstensi mendeklarasikan onboardingOperations dan menerapkan completeRegistration({values, i18n, descriptor, executeOnboarding}). executeOnboarding(operation, input) mengembalikan data hasil dan menolak operasi yang tidak dideklarasikan. Setiap operasi juga memerlukan penangan server aktif melalui auth:onboarding. apiFetch terautentikasi tanpa batas tidak disediakan. Pilihan pengguna, validasi, dan pemeriksaan versi tetap wajib; pendaftaran bukan persetujuan.

Ini perubahan kontrak yang tidak kompatibel. Terms of Service 1.6.13 memakai operasi persetujuan terbatas dan constructRegistrationUi. Rilis Cognis dan modul yang sesuai harus diterapkan bersama; nonaktifkan pendaftaran selama versi masih bercampur. Penyedia penyelesaian lain juga harus dimigrasikan. Tidak ada jalur cadangan token berizin luas.

Halaman pendaftaran tetap di luar tutorial pengguna yang sudah masuk. Panduan undangan dan kebijakan mempertahankan kontrol serta targetnya. Verifikasi email dan persetujuan mendahului login; pendaftaran tidak menyelesaikan penyiapan TFA.

Semua deklarasi operasi disalin dan dibekukan sebelum impor atau pemanggilan ekstensi apa pun. Penyedia yang mendeklarasikan operasi orientasi harus memuat penangan penyelesaian yang dapat dipanggil sebelum pembuatan akun diizinkan. Pembuat bidang dan ekstensi lain tidak dapat memperluas izin yang telah dicatat.

Kegagalan penyusunan konfigurasi pendaftaran menghasilkan registration_configuration_unavailable, bukan daftar integrasi kosong. Ekspor penyelesaian yang belum dimigrasikan dan tidak memiliki deklarasi operasi juga memblokir pendaftaran. Plugin opsional yang hanya menyediakan bidang tetap dimuat secara independen.

## Label Formulir Kata Sandi

Registration 1.2.9 memakai kunci milik host `ui.reuse.password_requirements` dan `ui.reuse.passwords_match` bersama Keamanan. Terapkan katalog UI host yang sesuai dan perbarui integrasi yang memakai label ini ke kunci bersama. Nilai bahasa pilihan yang tidak tersedia memakai kunci XML bahasa Inggris yang sama; nilai Inggris yang hilang atau kosong menghasilkan kegagalan eksplisit. Halaman pendaftaran publik tetap berada di luar tutorial pengguna masuk; kontrol panduan undangan dan kebijakan tidak berubah.
