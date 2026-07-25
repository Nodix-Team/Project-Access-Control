// ============================================================
//  kartu_normalize.h — Normalisasi card_id, BEBAS dependensi Arduino.
//  ESP32 Access Control System — v0.3
// ============================================================
//
// Kontrak §2.1 (Wiegand -> card_id) WAJIB identik di 3 layer:
//   backend   app/utils/kartu.py            normalize_kartu()
//   frontend  src/utils/kartu.ts            normalizeKartu()
//   firmware  fungsi ini                    acs::normalizeKartu()
//
// Ditaruh sebagai fungsi murni std::string (tanpa Arduino String / LittleFS) supaya bisa
// di-UNIT-TEST NATIVE di PC (`pio test -e native`) tanpa hardware — Sprint 1 CI/CD.
//
// CATATAN untuk Sprint 6 (firmware fisik): `UserStorage::normalizeKartu` saat ini punya
// implementasi sendiri memakai Arduino String. Sebaiknya di-refactor supaya MENDELEGASIKAN ke
// fungsi ini (satu sumber kebenaran), sehingga tidak ada risiko dua implementasi melenceng.
//
// Aturan (harus sama persis dengan py/ts):
//   1. trim spasi ujung.
//   2. kalau kosong -> kembalikan kosong (kejadian REX/alarm tanpa kartu).
//   3. kalau numerik murni & panjang < 10 -> pad '0' di depan sampai 10 digit (format %010lu).
//   4. selain itu (hex/alfanumerik / >=10 digit) -> biarkan panjangnya.
//   5. selalu uppercase di akhir (case-insensitive, mengikuti collation MySQL).
#pragma once

#include <string>
#include <cctype>

namespace acs {

inline std::string normalizeKartu(const std::string& raw) {
    // 1. trim
    size_t start = 0;
    size_t end = raw.size();
    while (start < end && std::isspace(static_cast<unsigned char>(raw[start]))) start++;
    while (end > start && std::isspace(static_cast<unsigned char>(raw[end - 1]))) end--;
    std::string clean = raw.substr(start, end - start);

    // 2. kosong -> kosong
    if (clean.empty()) return clean;

    // 3. numerik murni?
    bool isNumeric = true;
    for (char c : clean) {
        if (!std::isdigit(static_cast<unsigned char>(c))) {
            isNumeric = false;
            break;
        }
    }
    if (isNumeric && clean.size() < 10) {
        clean.insert(0, 10 - clean.size(), '0');
    }

    // 5. uppercase
    for (char& c : clean) {
        c = static_cast<char>(std::toupper(static_cast<unsigned char>(c)));
    }
    return clean;
}

}  // namespace acs
