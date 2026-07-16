# 🔍 Hasil Review Pull Request #4 — feat(sprint-2): Backend Core API

Dokumen ini berisi umpan balik peninjauan kode (*code review*) untuk PR #4 yang diajukan oleh **Emping (Rizal)**. Sesuai pembagian kerja di **ROADMAP_v0.2.md**, pengerjaan backend berada di bawah tanggung jawab Emping, sedangkan Anda bertindak sebagai peninjau (*reviewer*). 

> [!WARNING]
> **TINDAKAN:** Jangan melakukan merge atau modifikasi kode apa pun secara langsung pada branch backend. Serahkan poin-poin penyesuaian di bawah ini kepada Emping agar ia menyelesaikannya sendiri di branch `feature/backend-core`.

---

## 🛠️ Temuan Utama & Rekomendasi Penyesuaian

### 1. Resolusi Konflik `.env.example` (Pemblokir Merge Utama)
GitHub mendeteksi konflik pada file `backend/.env.example` karena konvensi penamaan variabel lingkungan berbeda antara branch `dev` saat ini dengan branch `feature/backend-core`:

| Variabel yang Dibaca `config.py` (Backend-Core) | Variabel di `.env.example` (Branch `dev`) | Keterangan |
| :--- | :--- | :--- |
| `MQTT_HOST` | `MQTT_BROKER` | Nama broker IP/Host |
| `MQTT_USERNAME` | `MQTT_USER` | Username koneksi EMQX |
| `JWT_EXPIRE_MINUTES` | `ACCESS_TOKEN_EXPIRE_MINUTES` | Waktu kedaluwarsa token |

*   **Rekomendasi:** Emping wajib melakukan merge `dev` terbaru ke dalam branchnya (`git merge dev`), lalu menyelesaikan konflik dengan menyesuaikan nama variabel di `config.py` atau `dev` agar satu konvensi (disarankan mengikuti nama yang dibaca oleh kode FastAPI).

---

### 2. Normalisasi ID Kartu 10-Digit & Case-Insensitive (P0 - Penting)
*   **Masalah 1 (Padding):** Mengikuti pembaruan aturan kritis pada proposal arsitektur (`docs/architecture_proposal_v0.2.md`), backend **wajib** melakukan padding `0` hingga 10 digit jika input kartu adalah numerik murni dan panjangnya kurang dari 10 digit (misal: `"123456"` -> `"0000123456"`). Jika tidak, lookup database untuk pencatatan log transaksi dari ESP32 akan gagal (*mismatch*).
*   **Masalah 2 (Case-Sensitivity):** Validasi dedup file di `csv_service.py` menggunakan Python `Set` (`seen_kartu`), yang membandingkan karakter secara *case-sensitive*. Namun, collation kolom `kartu` di MySQL adalah case-insensitive (`utf8mb4_general_ci`). Akibatnya, jika ada kartu `"aabbccdd"` dan `"AABBCCDD"` dalam satu file CSV, Python akan menganggapnya berbeda (lolos), namun MySQL akan menolaknya dengan error *Duplicate Entry* saat commit.
*   **Rekomendasi:** Gunakan fungsi helper normalisasi di backend pada saat memproses user baru atau parsing CSV:
    ```python
    def normalize_kartu(kartu: str) -> str:
        clean = kartu.strip().upper()  # upper menjamin case-insensitive konsisten
        if clean.isdigit() and len(clean) < 10:
            return clean.zfill(10)
        return clean
    ```

---

### 3. Batasan Panjang Password pada Enkripsi Bcrypt
*   **Masalah:** Pustaka `bcrypt` secara internal memiliki batas maksimum input string sebesar **72 byte**. Jika admin memasukkan password yang sangat panjang saat registrasi (misalnya menggunakan password manager yang menghasilkan string > 72 karakter), karakter ke-73 dst akan diabaikan oleh bcrypt. Ini bisa membingungkan dan mengurangi efektivitas entropi enkripsi.
*   **Rekomendasi:** Tambahkan validasi panjang maksimum string (`max_length=72`) pada Pydantic schema login/registrasi admin.

---

### 4. Evaluasi Struktur Kode
*   **Struktur FastAPI:** Pemisahan routing, model SQLAlchemy, skema Pydantic, dan logika bisnis dalam folder `services/` sudah sangat baik, modular, dan bersih.
*   **Resolusi Akses:** Fungsi `resolve_user_access` di `user_service.py` berhasil menerjemahkan mapping `door_id` global menjadi `door_number` lokal per-controller secara tepat tanpa membocorkan ID database ke luar.
*   **Sync Stubbing:** Endpoint `/api/controllers/{id}/sync` yang mengembalikan kode status `501 Not Implemented` sudah tepat demi memisahkan pengerjaan sync MQTT ke Sprint 3 berikutnya secara rapi.
