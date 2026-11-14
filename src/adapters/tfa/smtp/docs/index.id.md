# Adapter TFA SMTP

Metode Kode Email mengirim kode sekali pakai untuk penyiapan dan login melalui pengirim SMTP gateway Notifikasi. Panjang kode dimiliki kebijakan pengiriman pengirim tersebut; TFA membacanya melalui ctx.

## Contoh Penggunaan

1. Di Administrasi, konfigurasikan dan aktifkan SMTP pada gateway Notifikasi.
2. Atur **Panjang Kode** di sana, misalnya menjadi 8 digit, lalu simpan. Kode verifikasi email baru serta kode penyiapan dan login TFA Kode Email menggunakan nilai tersebut.
3. Di Pengaturan, aktifkan TFA Kode Email dan masukkan kode yang dikirim ke alamat email utama akun yang sudah diverifikasi. Saat login, gunakan kode dari tantangan terbaru; pengiriman ulang menerbitkan kode pengganti berdasarkan kebijakan terkini.

## Spesifikasi Teknis

### Persyaratan

- Pengirim SMTP gateway Notifikasi harus dikonfigurasi dan diaktifkan.
- Pemilik SMTP harus menyediakan `notify:emailDeliveryPolicy` versi 1, ketersediaan email, dan pengiriman melalui ctx. Tantangan baru gagal secara eksplisit jika pemilik tidak tersedia, dinonaktifkan, atau belum dikonfigurasi.
- Akun pengguna harus memiliki alamat email utama yang sudah diverifikasi.

### Konfigurasi dan Penyimpanan

Bidang **Panjang Kode** pada SMTP Notifikasi adalah satu-satunya sumber pengaturan yang dapat diedit dan disimpan untuk verifikasi email dan TFA Kode Email. Nilai bawaan adalah 6 digit, dinormalisasi menjadi bilangan bulat dan dibatasi ke 4–10 digit. TFA tidak memiliki pengaturan panjang kode terpisah yang dapat diedit atau disimpan dan tidak menyediakan kebijakan pengganti ketika pemilik tidak tersedia.

### Kebijakan Pengiriman dan Tantangan

Panjang kode dan jeda pengiriman berasal dari `notify:emailDeliveryPolicy` terkini saat kode diterbitkan. Fungsi verifikasi bersama menghasilkan digit acak kriptografis. Perubahan panjang yang disimpan berlaku untuk tantangan berikutnya, termasuk kode pengganti saat pengiriman ulang. Kode penyiapan dan login yang sudah diterbitkan mempertahankan panjang aslinya sampai digunakan, diganti, atau kedaluwarsa; perubahan pengaturan tidak menafsirkan ulang kode tersebut. Metadata panjang masukan menjelaskan tantangan yang diterbitkan, bukan nilai kebijakan yang berubah setelahnya.

Kode tantangan disimpan dalam memori proses. Memulai ulang aplikasi atau menonaktifkan metode membatalkan kode penyiapan dan login yang masih menunggu. Deployment dengan beberapa instans harus mengarahkan permintaan ke instans yang sama selama masa berlaku tantangan.

### Registrasi dan Siklus Hidup

Adapter mendaftarkan aksi pesan kodenya saat bootstrap melalui `notify:registerEmailPurpose` dan mengirim melalui `notify:deliverEmail`. Adapter memiliki registrasi, isi pesan, dan status tantangan; gateway TFA menyediakan hook siklus hidup adapter yang netral. Penonaktifan gateway membatalkan antrean SMTP dan tantangan tertundanya. Aktivasi ulang membuat registrasi baru tanpa memulihkan tantangan lama. Tampilan login dan sumber bahasa dimiliki metode ini.

## Pengiriman tantangan berbatas waktu

SMTP TFA mewajibkan `notify:deliverEmail` versi 1 melalui registri kontrak publik, tanpa pengganti `notify:sendEmail` atau opsi yang diabaikan. Kode baru yang diterima mengganti dan membatalkan hanya pengiriman lama yang sesuai. Penolakan penerimaan mempertahankan kode sebelumnya. Kegagalan pengiriman berikutnya membatalkan kode baru; kirim ulang secara eksplisit selama percobaan masih berlaku untuk memulihkan. Permintaan kirim ulang bersamaan digabung hanya dalam operasi pemilik yang sama. Penyiapan dan login mandiri memiliki ID serta pembatalan terpisah. Kode sekali pakai berakhir pada batas lebih awal antara tenggat pemilik dan 15 menit; callback terlambat tidak memulihkannya. Status antrean dan terkirim ditampilkan berbeda. Terapkan Notification SMTP 0.5.5, SMTP TFA 1.1.3, TFA 1.3.12, dan Auth 2.2.11 bersama; penyedia alternatif harus menerapkan kontrak tersebut.
