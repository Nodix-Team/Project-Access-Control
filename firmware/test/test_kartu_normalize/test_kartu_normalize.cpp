// ============================================================
//  test_kartu_normalize.cpp — Unit test NATIVE untuk acs::normalizeKartu
//  Dijalankan: pio test -e native
// ============================================================
//
// Ini test native PERTAMA firmware (Sprint 1 CI/CD) — membuktikan harness `[env:native]` jalan
// tanpa hardware. Nilai ekspektasi = GOLDEN yang sama dengan test frontend (kartu.test.ts) dan
// backend (test normalize_kartu). Kalau salah satu layer melenceng, kartu tidak akan match di
// lapangan — itulah kenapa kontrak ini diuji berlapis.
#include <unity.h>
#include "../../src/util/kartu_normalize.h"

// NOTE: numerik < 10 digit -> pad nol jadi 10 (format produksi %010lu dari Wiegand).
void test_numeric_padded_to_10(void) {
    TEST_ASSERT_EQUAL_STRING("0000123456", acs::normalizeKartu("123456").c_str());
    TEST_ASSERT_EQUAL_STRING("0000000005", acs::normalizeKartu("5").c_str());
}

// NOTE: numerik tepat 10 digit tidak berubah.
void test_numeric_exactly_10(void) {
    TEST_ASSERT_EQUAL_STRING("0000123456", acs::normalizeKartu("0000123456").c_str());
}

// NOTE: > 10 digit dibiarkan (memotong = kartu berbeda = berbahaya).
void test_numeric_over_10_kept(void) {
    TEST_ASSERT_EQUAL_STRING("123456789012", acs::normalizeKartu("123456789012").c_str());
}

// NOTE: hex/alfanumerik tidak di-pad, hanya uppercase (kartu warisan v0.2 spt AABBCCDD).
void test_hex_uppercased_not_padded(void) {
    TEST_ASSERT_EQUAL_STRING("AABBCCDD", acs::normalizeKartu("aabbccdd").c_str());
    TEST_ASSERT_EQUAL_STRING("DEADBEEF", acs::normalizeKartu("DeadBeef").c_str());
}

// NOTE: spasi ujung di-trim sebelum normalisasi.
void test_trim(void) {
    TEST_ASSERT_EQUAL_STRING("0000123456", acs::normalizeKartu("  123456  ").c_str());
    TEST_ASSERT_EQUAL_STRING("AABBCCDD", acs::normalizeKartu(" aabbccdd ").c_str());
}

// NOTE: kosong tetap kosong (kejadian tanpa kartu: REX / alarm sensor).
void test_empty_stays_empty(void) {
    TEST_ASSERT_EQUAL_STRING("", acs::normalizeKartu("").c_str());
    TEST_ASSERT_EQUAL_STRING("", acs::normalizeKartu("   ").c_str());
}

int main(int, char**) {
    UNITY_BEGIN();
    RUN_TEST(test_numeric_padded_to_10);
    RUN_TEST(test_numeric_exactly_10);
    RUN_TEST(test_numeric_over_10_kept);
    RUN_TEST(test_hex_uppercased_not_padded);
    RUN_TEST(test_trim);
    RUN_TEST(test_empty_stays_empty);
    return UNITY_END();
}
