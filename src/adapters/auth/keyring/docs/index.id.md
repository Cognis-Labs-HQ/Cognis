# Adapter Keyring Pengguna

PUT brankas memakai pembaca aliran JSON bersama milik API dengan anggaran brankas efektif dan tambahan 1 KiB untuk amplop. Kebijakan, galat 413, dan validasi data terserialisasi tetap dimiliki adaptor; tidak ada implementasi penyanggaan kedua.

Batas bawaan brankas adalah 2 MiB dengan batas mutlak pemrosesan 8 MiB. Kebijakan efektif dikembalikan kepada klien. PUT menghitung byte masuk sebelum penyanggaan atau penguraian JSON dan menolak permintaan terlalu besar; GET memeriksa ukuran tersimpan sebelum penguraian. Amplop terenkripsi menggunakan baris utama serta baris lanjutan terbatas, dengan penggantian dan penghapusan atomik serta satu pembacaan gabungan. Tiap bagian tersimpan paling besar 60.000 byte UTF-8; server tetap tidak mendekripsi rahasia.

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

Adapter wajib ini menggunakan `db:executor` aktif. Administrator mengatur ukuran maksimum brankas terenkripsi dalam MiB dan jumlah iterasi penurunan kata sandi melalui pengaturan adapter. Brankas yang sudah ada mempertahankan jumlah penurunan yang tersimpan; nilai konfigurasi berlaku saat brankas dibuat. Kapasitas bawaan brankas terenkripsi adalah 2 MiB.

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

## Privasi akun dan isolasi keyring

Brankas browser terenkripsi disimpan terpisah menurut origin, ID akun, dan ID instans akun dari server. Server harus memverifikasi akun serta instans sebelum cache dimuat. Kata sandi dan kunci dekripsi hanya ada di memori; kunci pembuka IndexedDB lama dihapus. Setelah memuat ulang, kata sandi keyring diperlukan kembali, kecuali login kata sandi berhasil mendekripsi brankas. Pergantian akun membatalkan dialog dan operasi kriptografi yang tertunda. Membuka keyring tidak membuat keyring baru; pembuatan memerlukan penyiapan atau tindakan Buat secara eksplisit.

## Akses yang dibatalkan dan pemulihan manual

Membatalkan permintaan buka kunci beratribusi menolak semua penunggu bersamaan dan menekan permintaan otomatis berikutnya sampai halaman dimuat ulang. Adapter memancarkan `cognis:keyring-access-state` dengan `{ suppressed: true }`; poller konten terenkripsi harus berhenti dalam keadaan ini. Kontrol kunci mengambang di atas tumpukan tombol page composer menyediakan satu-satunya percobaan buka kunci manual. Setelah autentikasi berhasil, kontrol menghapus penekanan dan memancarkan `{ suppressed: false }`.

## Reset destruktif

`DELETE /api/v1/auth/keyring` adalah kontrak reset destruktif. Sebelum menghapus vault buram, Authentication memanggil setiap pemilik yang terdaftar melalui `auth:registerKeyringDataOwner`, hanya menghapus akun dari ruang terenkripsi dan objek lain yang aksesnya bergantung pada entri keyring. Instans akun, profil, hubungan pengikut, dan data akun yang tidak bergantung tetap tidak berubah. Tindakan Settings saat terkunci memakai rute ini, lalu mengganti semua kontrol keyring dengan banner “Keyring tidak ditemukan” dan satu tindakan Buat. Pembuatan meminta konfirmasi kata sandi serta batas waktu penguncian otomatis. Saat terbuka, tindakan tetap hanya menghapus entri dari vault saat ini.

## Batasi Pertumbuhan Aktivitas

Brankas terenkripsi menyimpan paling banyak 1.000 aktivitas terbaru dalam batas riwayat 64 KiB; nilai rahasia tidak pernah dihapus untuk memenuhi batas tersebut. Pembacaan berulang berbagi proses penyimpanan yang berjalan. GET terautentikasi dapat mengambil brankas yang ada hingga batas mutlak 8 MiB agar klien dapat meringkas riwayat meskipun batas penulisan lebih rendah. PUT tetap menerapkan batas yang dikonfigurasi. Kegagalan sinkronisasi latar belakang menampilkan notifikasi kesalahan dan mempertahankan salinan lokal terenkripsi.
