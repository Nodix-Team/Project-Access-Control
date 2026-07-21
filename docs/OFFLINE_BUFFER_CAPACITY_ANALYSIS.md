# Analisis Kapasitas Ring Buffer Log Offline (ESP32)

> Menjawab pertanyaan: berapa banyak transaksi yang bisa ditampung Controller saat offline lama, apa yang terjadi begitu limitnya tercapai, dan berapa kapasitas riilnya kalau firmware ini di-deploy ke ESP32-WROOM-32 fisik.
> Sumber: kode aktual `firmware/src/storage/OfflineLogBuffer.cpp` + `firmware/src/mqtt/MqttManager.cpp` + `firmware/platformio.ini` (bukan cuma dokumen proposal).

## 1. Batas Kapasitas: 500 Baris (Bukan Batas Ukuran Byte)

Firmware menyimpan log offline sebagai baris teks CSV di `/logs/offline_buffer.csv` (LittleFS), dengan batas jumlah baris dikontrol konstanta:

```cpp
// firmware/src/storage/OfflineLogBuffer.cpp:10
#define MAX_LOG_LINES 500
```

Format satu baris (`OfflineLogBuffer.cpp:32`):

```
{uptime_ms},{kartu},{door_number},{status}
```

Contoh nyata: `123456,AABBCCDD,1,GRANTED`

## 2. Perilaku Saat Buffer Penuh

Fungsi `_enforceRingBufferLimit()` (`OfflineLogBuffer.cpp:40-82`) dipanggil **setiap kali sebelum** `appendLog()` menyimpan transaksi baru:

```
1. Hitung total baris di file
2. Jika total >= 500 baris:
     → hapus SATU baris paling ATAS (paling lama)
3. Tambahkan baris baru di paling BAWAH (append)
```

**Kesimpulan perilaku:**

| Transaksi | Nasib saat buffer penuh |
|---|---|
| **Terbaru** | Selalu tersimpan (di-append) — tidak pernah ditolak |
| **Terlama** | Dihapus permanen begitu limit tercapai — **tidak akan pernah terkirim ke backend**, bahkan setelah reconnect |

Ini FIFO murni ("ring buffer"): buffer selalu berisi **500 transaksi paling akhir** yang terjadi selama offline. Prinsip desainnya (sesuai `architecture_proposal_v0.2.md`): log terbaru dianggap lebih penting daripada log lama.

## 3. Perhitungan Ukuran per Baris

| Komponen | Contoh | Ukuran |
|---|---|---|
| `uptime_ms` (`millis()`, sampai 10 digit sebelum wrap ~49 hari uptime) | `123456` s/d `4294967295` | 6-10 byte |
| `,kartu` (format umum 8-10 karakter) | `,AABBCCDD` | 9-11 byte |
| `,door_number` (1-4) | `,1` | 2 byte |
| `,status` (`GRANTED`/`DENIED`) | `,GRANTED` | 8 byte (kasus terpanjang) |
| `\n` | — | 1 byte |
| **Total per baris** | | **~26-30 byte** |

**500 baris × ~28 byte ≈ 13-15 KB** untuk buffer penuh.

## 4. Kapasitas Riil di ESP32-WROOM-32

`firmware/platformio.ini` menetapkan:

```ini
[env:esp32dev]
board = esp32dev
board_build.filesystem = littlefs
```

Tidak ada custom partition table (`board_build.flash_size` / `partitions.csv`) — berarti pakai skema partisi default Arduino-ESP32. Untuk ESP32-WROOM-32 varian flash 4MB (paling umum & termurah di pasaran), partisi LittleFS default besarnya **~1.5 MB**.

| | Nilai |
|---|---|
| Kapasitas LittleFS (default, flash 4MB) | ~1.5 MB |
| Kebutuhan buffer saat ini (500 baris) | ~13-15 KB |
| **Persentase terpakai** | **~1%** |
| Kapasitas teoritis maksimum kalau partisi dipakai penuh untuk buffer ini | **~50.000+ entri** |

**Kesimpulan kunci: limit 500 baris BUKAN batas fisik hardware.** Itu murni keputusan desain di kode (`MAX_LOG_LINES`). Secara fisik, board ini punya headroom besar (~100x lipat) untuk menampung jauh lebih banyak transaksi offline.

## 5. Kalau Mau Menaikkan `MAX_LOG_LINES`, Ada 2 Trade-off

Menaikkan angka ini **bukan** sekadar "muat atau tidak muat di flash" — ada 2 hal lain yang ikut terdampak:

1. **Waktu replay saat reconnect** — `replayLogs()` (`OfflineLogBuffer.cpp:84-127`) mengirim log **satu per satu** via MQTT begitu koneksi pulih. Makin banyak entri tertampung, makin lama proses "banjir" replay ke backend sebelum controller kembali normal mengirim log real-time.

2. **`_enforceRingBufferLimit()` melakukan read + rewrite SELURUH file, bukan circular buffer dengan pointer.** Begitu buffer penuh, **setiap tap kartu baru berikutnya** (selama masih offline) memicu baca ulang + tulis ulang seluruh isi file ke `offline_temp.csv`. Dengan cap 500 baris, ini masih murah (~15 KB per rewrite). Kalau dinaikkan ke puluhan ribu baris, setiap tap-saat-buffer-penuh berarti menulis ulang ratusan KB–beberapa MB ke flash **setiap kali** — dan flash write ESP32 jauh lebih lambat dibanding operasi RAM biasa, berisiko bikin keputusan akses (buka pintu) jadi lambat/nge-lag tepat saat sedang offline.

## 6. Rekomendasi

Kalau kapasitas 500 dirasa kurang untuk skenario offline yang sangat lama (misal lebih dari 1 hari dengan traffic tinggi), disarankan:
- Naikkan `MAX_LOG_LINES` secukupnya (misal 2000-5000) — masih jauh di bawah kapasitas fisik (~50.000), dengan overhead rewrite yang masih wajar (~60-150 KB per rewrite saat buffer penuh).
- **Hindari** menaikkan ke puluhan ribu tanpa mengubah `_enforceRingBufferLimit()` menjadi circular buffer sungguhan (misal pakai index head/tail alih-alih read+rewrite seluruh file) — kalau target kapasitasnya sangat besar, refactor struktur data ini jadi prasyarat, bukan sekadar ubah angka konstanta.
