# Skor Keterlibatan

## Alur penyedia

Penyedia bahasa dan aktivitas memperluas keterlibatan hanya melalui kapabilitas `ctx` publik. Saat bootstrap, gunakan `engagement:scoring` untuk mendaftarkan bobot bawaan jenis aktivitas, pengubah terjadwal berdasarkan cakupan, dan booster yang dapat ditukar. Gunakan `engagement:achievements` untuk mendaftarkan lencana normal, langka, atau legendaris. Kirim kumpulan yang selesai melalui `engagement:recordActivity`; tampilan item belajar mandiri tidak memberikan XP.

Aktivitas menyertakan ID peristiwa bukti yang unik, ID penyedia dan peserta, kesulitan konten, waktu selesai, bobot penyedia opsional, serta cakupan seperti `language` dan `activity`. Bobot penyedia eksplisit menggantikan bobot bawaan jenis aktivitas. Kesulitan, bobot, pengubah, petunjuk, akurasi, jawaban mandiri, penyelesaian pertama, pengulangan, dan target waktu penyedia memengaruhi skor. Pengulangan memakai satu tingkat pengurangan tetap, bukan penurunan berkelanjutan.

## Orkestrasi

`engagement:recordActivity` menjalankan `engagement:scoreActivity` melalui tahap `validate`, `score`, `achievements`, dan `publish`. Tahap achievement menyusun `engagement:evaluateAchievements` dengan tahap `collect`, `evaluate`, dan `award`. Penyedia dapat memperluas alur ini tanpa mengimpor internal core.

## Keamanan dan bukti

Bobot dan pengali menerima nilai `0.01` hingga `10`; kesulitan menerima `0.1` hingga `10`. ID peristiwa harus unik, durasi dan jumlah petunjuk tidak boleh negatif, serta target waktu harus berurutan. Booster sekali pakai khusus peserta dan dihapus setelah skor pertama yang cocok. Penghargaan achievement membekukan label, kesulitan, ikon, waktu, dan ID bukti agar perubahan definisi tidak menulis ulang lencana yang sudah diperoleh.
