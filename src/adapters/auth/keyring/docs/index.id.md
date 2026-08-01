# Adapter Keyring Pengguna

## Ringkasan

Adapter Keyring Pengguna menyimpan brankas buram yang dienkripsi di peramban untuk akun terautentikasi. Adapter Autentikasi ini wajib agar kata sandi, kunci enkripsi, dan rahasia khusus pengguna tersedia melalui satu kapabilitas stabil tanpa bergantung pada penyedia masuk.

Antarmuka peramban tetap berada di `src/adapters/auth/keyring/ui/keyring.js`. Enkripsi dan dekripsi berlangsung di peramban; adapter tidak pernah menerima rahasia teks biasa.

## Tanggung Jawab

- Memulai penyimpanan brankas melalui kapabilitas `db:executor`.
- Menyumbangkan pabrik rute dan kapabilitas penyimpanan melalui `ctx`.
- Menyimpan dan mengembalikan amplop brankas buram yang tervalidasi.

Tidak bertanggung jawab atas: autentikasi pengguna, penurunan kunci, atau penafsiran rahasia tersimpan.

## Arsitektur

`src/adapters/auth/keyring/index.ts` ditemukan Gateway Autentikasi dan menyumbangkan `auth:keyringVaultStore` serta `auth:keyringRouteFactory`. Gateway memasok konteks rutenya ke pabrik sehingga pemeriksaan autentikasi tetap diinjeksi. `src/adapters/auth/keyring/store.ts` mengakses persistensi hanya melalui kapabilitas eksekutor basis data.

## Konfigurasi

Adapter wajib ini menggunakan `db:executor` aktif. Administrator mengatur ukuran maksimum brankas terenkripsi dalam MiB dan jumlah iterasi penurunan kata sandi melalui pengaturan adapter. Brankas yang sudah ada mempertahankan jumlah penurunan yang tersimpan; nilai konfigurasi berlaku saat brankas dibuat.

## Rute API

| Metode | Jalur                  | Deskripsi                         | Autentikasi |
| ------ | ---------------------- | --------------------------------- | ----------- |
| GET    | `/api/v1/auth/keyring` | Membaca brankas terenkripsi akun. | Pengguna    |
| PUT    | `/api/v1/auth/keyring` | Mengganti brankas terenkripsi.    | Pengguna    |
| DELETE | `/api/v1/auth/keyring` | Menghapus brankas terenkripsi.    | Pengguna    |

## API capability browser

Komponen memperoleh operasi gantungan kunci melalui `uiCtx.capabilities` dan tidak mengimpor internal adaptor. Gunakan `keyring:forComponent` untuk membuat lingkup yang beratribusi, lalu selesaikan rahasia dengan pengenal stabil milik capability. Resolusi memvalidasi nilai yang ada dan dapat meminta pengguna atau berkonsultasi dengan sumber otoritatif saat nilai hilang atau tidak valid. Status kunci, pengelolaan entri, perubahan kata sandi, halaman aktivitas, dan siklus hidup gantungan kunci tamu sementara juga tersedia sebagai capability.

```js
const keyring = uiCtx.capabilities.require("keyring:forComponent")("Meetings");
const password = await keyring.resolve("meeting:123:password", {
    action: "join",
    process: "meeting 123",
    validate: (value) => value.length > 0,
    prompt: ({ invalid }) => askForPassword(invalid),
});
```

## Perilaku buka kunci saat masuk

Saat masuk, adapter hanya mencoba mendekripsi brankas yang ada dengan kata sandi akun. Percobaan yang gagal membiarkan brankas terkunci, tidak membuka dialog buka kunci, dan tidak menghambat navigasi ke dasbor. Dialog buka kunci kontekstual baru diminta saat komponen menyelesaikan konten yang didukung keyring.

## Pemulihan buka kunci sesi peramban

Setelah berhasil dibuka, adapter menyimpan kunci Web Crypto yang tidak dapat diekstrak di penyimpanan kunci sesi IndexedDB dan hanya menulis penanda nonrahasia ke `sessionStorage`. Batas penguncian terbatas mencatat satu tenggat absolut saat keyring dibuka; pembacaan, penulisan, pemuatan ulang halaman, dan mulai ulang server tidak memperpanjang atau memperpendeknya. “Saat Keluar” tidak menyimpan tenggat dan mempertahankan keyring terbuka sampai sesi terautentikasi berakhir secara eksplisit. Penguncian eksplisit, keluar, ketidakcocokan instans akun, dan tenggat yang berlalu membatalkan pemulihan. Komponen tetap meminta akses melalui lingkup keyring beratribusi yang mencoba pemulihan lebih dahulu dan hanya membuka dialog kontekstual saat diperlukan.
