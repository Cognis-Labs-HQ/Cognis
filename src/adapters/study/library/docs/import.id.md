# Impor Pustaka Terstruktur

## Penggunaan

Gunakan **Impor** di kiri bawah pemilih jenis kartu untuk mengunggah JSON. Pilih cakupan yang dapat ditulis untuk seluruh kelompok. Format berisi `format: "cognis-library"`, `version: 1`, dan larik `entries` yang tidak kosong.

## Spesifikasi Teknis

Setiap entri memerlukan `key` lokal unik, `schemaId` terpasang, `layer`, `label`, serta semua bidang dan hubungan wajib lapisan tersebut. Cognis menerapkan nilai bawaan konstruktor dan versi skema saat ini. Kunci pelokalan definisi dibuat otomatis. Karakter atomik dan partikel hanya dapat dibuat penyedia konten. Pola goresan harus mengikuti format terstruktur tervalidasi yang digunakan penyusun kartu.

```json
{
    "format": "cognis-library",
    "version": 1,
    "entries": [
        {
            "key": "room-definition",
            "schemaId": "japanese-core",
            "layer": "definitions",
            "label": "room",
            "fields": {
                "translations": {
                    "en": "room"
                }
            }
        },
        {
            "key": "classroom",
            "schemaId": "japanese-core",
            "layer": "words",
            "label": "教室",
            "fields": {
                "pronunciation": ["きょうしつ"]
            },
            "references": [
                {
                    "relation": "definitions",
                    "entryId": "room-definition"
                }
            ]
        }
    ]
}
```

Gunakan `key` entri lain sebagai `entryId` di `references` atau `referenceGroups`. Cognis membuat UUID terlebih dahulu, mengganti kunci, dan memproses ketergantungan yang siap dalam kelompok per lapisan. UUID yang sudah ada harus terlihat dalam cakupan tujuan. Target hilang, lapisan tidak cocok, siklus, goresan tidak valid, bidang wajib kosong, atau konten duplikat membatalkan seluruh transaksi. Respons berisi entri dan pemetaan UUID `ids`.

Setiap kartu mendukung maksimal 8 tag, 16 pelafalan, dan 10 definisi, selain batas panjang bidang dan jumlah hubungan. Impor JSON memvalidasi batas tersebut. Impor kamus memangkas nilai berlebih sebelum menyimpan. Penyusun menolak definisi kesebelas.
