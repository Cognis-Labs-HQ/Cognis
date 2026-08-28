# Kontrol Namespace File yang Lebih Matang

**Feature Branch:** N/A

## Kontrak namespace diperketat

Gateway file kini memvalidasi pengenal namespace dan komponen saat pendaftaran, menormalkan daftar izin, dan menyimpan definisi namespace yang tidak dapat diubah agar komponen masa depan memakai kontrak namespace yang dapat diprediksi.

## Perilaku ACL dan kuota yang lebih aman

Pembacaan file bernamespace tetap dapat dibagikan sesuai batas namespace masing-masing, tetapi penimpaan dan penghapusan dibatasi untuk pemilik atau aktor berhak istimewa. Pemeriksaan kuota kini menghitung penimpaan oleh pemilik yang sama berdasarkan selisih ukuran akhirnya saja.

## Commits
