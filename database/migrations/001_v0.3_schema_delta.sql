-- ═══════════════════════════════════════════════════════════════
-- Migrasi 001 — Delta skema v0.2.0 → v0.3.0
-- STATUS: USULAN / DRAFT — menunggu ACK @danskiv (lihat docs/KEPUTUSAN_ARSITEKTUR_v0.3.md §4)
-- JANGAN dijalankan di database produksi sebelum keputusan §4 dibekukan.
--
-- Sumber: docs/ERD_v0.3.mermaid, docs/CONTRACT-CODES-V0.3.md, docs/ARCHITECTURE-PROPOSAL-V0.3.md
-- Syarat: MySQL 8.0.16+ (CHECK constraint benar-benar ditegakkan, bukan diabaikan)
--
-- Cara pakai:
--   mysql -u root -p access_control < database/migrations/001_v0.3_schema_delta.sql
-- ═══════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────
-- PRASYARAT WAKTU (§4.3 R2)
-- Kolom DEFAULT CURRENT_TIMESTAMP mengikuti zona waktu SESI MySQL, sedangkan backend
-- menulis server_ts dalam UTC. Kalau sesi MySQL memakai +07:00, `created_at` dan
-- `server_ts` akan beda 7 jam di baris YANG SAMA. Paksa UTC di level server:
--   my.cnf  ->  [mysqld]
--               default_time_zone = '+00:00'
-- dan di backend (app/database.py) tambahkan pada connect_args / URL:
--   ?init_command=SET time_zone='+00:00'
-- Verifikasi setelah migrasi:  SELECT @@global.time_zone, @@session.time_zone;
-- ───────────────────────────────────────────────────────────────

START TRANSACTION;

-- ═══════════════════════════════════════════
-- 1. DOORS — konfigurasi per-pintu (§4.1)
--    Dipetakan ke parameter MQTT dX_ : doors.door_number = X
-- ═══════════════════════════════════════════

ALTER TABLE doors
    ADD COLUMN is_active        BOOLEAN           NOT NULL DEFAULT TRUE AFTER lokasi,      -- dX_active
    ADD COLUMN open_timeout_s   SMALLINT UNSIGNED NOT NULL DEFAULT 10   AFTER is_active,   -- dX_open_timeout_s
    ADD COLUMN held_timeout_s   SMALLINT UNSIGNED NOT NULL DEFAULT 30   AFTER open_timeout_s,  -- dX_held_timeout_s
    ADD COLUMN alarm_duration_s SMALLINT UNSIGNED NOT NULL DEFAULT 30   AFTER held_timeout_s;  -- dX_alarm_duration_s

-- Batas nilai ditegakkan di DB, bukan cuma di form frontend. held < open = alarm bunyi
-- sebelum orang sempat masuk (bug yang tidak kelihatan sampai dipasang di lapangan).
ALTER TABLE doors
    ADD CONSTRAINT ck_door_open_timeout CHECK (open_timeout_s   BETWEEN 1 AND 120),
    ADD CONSTRAINT ck_door_held_timeout CHECK (held_timeout_s   BETWEEN 1 AND 600),
    ADD CONSTRAINT ck_door_alarm_dur    CHECK (alarm_duration_s BETWEEN 0 AND 600),
    ADD CONSTRAINT ck_door_held_ge_open CHECK (held_timeout_s >= open_timeout_s);

-- ═══════════════════════════════════════════
-- 2. CONTROLLERS — state sync + snapshot kesehatan (§4.5, §5.2)
--    CATATAN: is_online TETAP tidak disimpan (keputusan v0.2 #8) — dihitung dari last_seen.
--    Kolom di bawah adalah LAPORAN TERAKHIR dari device (state), selalu dibaca
--    berpasangan dengan last_seen; kalau controller offline, anggap BASI.
-- ═══════════════════════════════════════════

ALTER TABLE controllers
    -- Rekonsiliasi & anti-loop
    ADD COLUMN sync_state ENUM('UNKNOWN','IN_SYNC','SYNC_PENDING','SYNCING','SYNC_ERROR_ATTENTION_REQUIRED')
                                        NOT NULL DEFAULT 'UNKNOWN'      AFTER last_seen,
    ADD COLUMN sync_fail_count TINYINT UNSIGNED NOT NULL DEFAULT 0      AFTER sync_state,
    ADD COLUMN last_sync_at    DATETIME          NULL                   AFTER sync_fail_count,
    ADD COLUMN last_sync_error VARCHAR(100)      NULL                   AFTER last_sync_at,
    -- Dinaikkan +1 tiap config controller/pintu berubah. Controller melaporkannya balik di
    -- config/response -> drift config ketahuan tanpa membandingkan semua field satu per satu.
    ADD COLUMN config_version  INT UNSIGNED      NOT NULL DEFAULT 1     AFTER last_sync_error,
    -- Konektivitas dari LWT (beda dari is_online yang dihitung dari timeout heartbeat)
    ADD COLUMN link_state      ENUM('ONLINE','OFFLINE','UNKNOWN') NOT NULL DEFAULT 'UNKNOWN' AFTER config_version,
    ADD COLUMN link_changed_at DATETIME          NULL                   AFTER link_state,
    -- Snapshot heartbeat: uptime_s,rssi,free_heap,total_users
    ADD COLUMN fw_version           VARCHAR(20)  NULL                   AFTER link_changed_at,
    ADD COLUMN uptime_s             INT UNSIGNED NULL                   AFTER fw_version,
    ADD COLUMN rssi                 SMALLINT     NULL                   AFTER uptime_s,
    ADD COLUMN free_heap            INT UNSIGNED NULL                   AFTER rssi,
    ADD COLUMN total_users_reported INT UNSIGNED NULL                   AFTER free_heap,
    -- Kesehatan fisik (dilaporkan lewat topic events)
    ADD COLUMN tamper_state ENUM('OK','TAMPER','UNKNOWN')               NOT NULL DEFAULT 'UNKNOWN' AFTER total_users_reported,
    ADD COLUMN fire_state   ENUM('OK','FIRE','UNKNOWN')                 NOT NULL DEFAULT 'UNKNOWN' AFTER tamper_state,
    ADD COLUMN power_state  ENUM('POWER_NORMAL','POWER_LOW','UNKNOWN')  NOT NULL DEFAULT 'UNKNOWN' AFTER fire_state;

-- ═══════════════════════════════════════════
-- 3. ACCESS_LOGS — dukung kejadian tanpa kartu + waktu dari RTC (§4.3)
-- ═══════════════════════════════════════════

-- REX / DOOR_FORCED_OPEN / DOOR_HELD_OPEN tidak punya kartu. Tanpa ini, INSERT gagal
-- dan log alarm HILANG diam-diam.
ALTER TABLE access_logs
    MODIFY COLUMN kartu VARCHAR(20) NULL;

ALTER TABLE access_logs
    -- Snapshot nomor pintu lokal: door_id di-SET NULL kalau pintu dihapus, tapi "pintu 3"
    -- harus tetap terbaca di riwayat.
    ADD COLUMN door_number TINYINT UNSIGNED NULL AFTER door_id,
    -- Snapshot device_id: controller_id memang bukan FK, jadi tanpa ini log yatim tidak
    -- bisa ditelusuri ke unit mana.
    ADD COLUMN device_id   VARCHAR(50)      NULL AFTER controller_id,
    -- Waktu apa adanya dari RTC DS3231 (UTC). server_ts tetap kolom otoritatif untuk
    -- urutan/tampilan; device_ts dipakai mendeteksi RTC ngaco (§4.3 R4).
    ADD COLUMN device_ts   DATETIME(3)      NULL AFTER server_ts,
    -- Monotonic 32-bit Sequence Counter dari firmware (v0.3.0 §5.6).
    ADD COLUMN seq_id      INT UNSIGNED     NULL AFTER device_ts;

-- Filter "tampilkan hanya ALARM" di dashboard & halaman log.
ALTER TABLE access_logs
    ADD INDEX idx_result_ts (result, server_ts);

-- device_uptime_ms TIDAK di-drop: log v0.2 lama masih memakainya. Untuk log v0.3 diisi NULL.

-- ═══════════════════════════════════════════
-- 4. CONTROLLER_EVENTS — kejadian NON-akses (§4.2)
--    tamper / fire / power / aux / sync / system. Tidak punya kartu, biasanya tanpa pintu.
-- ═══════════════════════════════════════════

CREATE TABLE controller_events (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    controller_id INT NULL,                       -- sengaja BUKAN FK (konsisten dgn access_logs)
    device_id     VARCHAR(50) NOT NULL,           -- SNAPSHOT
    event_type    ENUM('TAMPER','FIRE','POWER','AUX','SYNC','SYSTEM') NOT NULL,
    event_code    VARCHAR(40) NOT NULL,           -- TAMPER_OPEN, FIRE_ACTIVE, POWER_LOW, BOOT, ...
    severity      ENUM('INFO','WARNING','ALARM') NOT NULL DEFAULT 'INFO',
    door_number   TINYINT UNSIGNED NULL,          -- diisi hanya bila event terikat 1 pintu
    detail        VARCHAR(255) NULL,              -- opsional (mis. tegangan terbaca)
    server_ts     DATETIME(3) NOT NULL,           -- waktu KEJADIAN (UTC)
    device_ts     DATETIME(3) NULL,               -- epoch RTC controller
    is_replayed   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ev_ctrl_ts (controller_id, server_ts),
    INDEX idx_ev_type_ts (event_type, server_ts),
    INDEX idx_ev_sev_ts  (severity, server_ts)
);

-- ═══════════════════════════════════════════
-- 5. ALARMS — antrian "butuh perhatian admin" + acknowledge (§4.2)
--    BUKAN duplikat log: ini state kerja admin, sumbernya menunjuk ke baris log/event.
-- ═══════════════════════════════════════════

CREATE TABLE alarms (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    source        ENUM('ACCESS_LOG','CONTROLLER_EVENT') NOT NULL,
    source_id     BIGINT NOT NULL,                -- access_logs.id atau controller_events.id
    controller_id INT NULL,
    device_id     VARCHAR(50) NOT NULL,
    door_number   TINYINT UNSIGNED NULL,          -- NULL untuk alarm level controller
    alarm_code    VARCHAR(40) NOT NULL,           -- DOOR_FORCED_OPEN / TAMPER_OPEN / SYNC_ERROR_ATTENTION_REQUIRED
    raised_at     DATETIME(3) NOT NULL,
    -- DUA state yang sengaja DIPISAH (lihat §5.7):
    --   cleared_at = kondisi fisiknya sudah normal lagi (TAMPER_CLOSED/FIRE_CLEARED dari device)
    --   acked_at   = ADMIN sudah melihat & menerima alarm ini
    -- Alarm yang sudah clear TAPI belum di-ack tetap wajib tampil - kalau tidak, tamper
    -- yang dibuka lalu ditutup lagi akan lewat tanpa ada yang tahu.
    cleared_at    DATETIME(3) NULL,               -- NULL = kondisi masih aktif di lapangan
    acked_at      DATETIME(3) NULL,               -- NULL = BELUM dilihat admin
    acked_by      INT NULL,
    ack_note      VARCHAR(255) NULL,
    -- Idempoten: pesan MQTT QoS 1 bisa datang dua kali / ikut REPLAYED. Tanpa UNIQUE ini,
    -- satu kejadian bisa jadi banyak alarm dan admin meng-ack berkali-kali.
    UNIQUE KEY uk_alarm_source (source, source_id),
    INDEX idx_alarm_open (acked_at, raised_at),
    FOREIGN KEY (acked_by) REFERENCES admins(id) ON DELETE SET NULL
);

-- ═══════════════════════════════════════════
-- 6. ADMIN_LOGS — jejak audit aksi admin
--    Sudah digambar di ERD_v0.2.mermaid tapi TIDAK PERNAH dibuat di schema.sql.
--    Jadi wajib di v0.3 karena ada endpoint yang MEMBUKA PINTU FISIK (relay test, §5.3 E7).
-- ═══════════════════════════════════════════

CREATE TABLE admin_logs (
    id             BIGINT AUTO_INCREMENT PRIMARY KEY,
    admin_id       INT NULL,
    admin_username VARCHAR(50) NULL,              -- SNAPSHOT
    aksi           VARCHAR(50) NOT NULL,          -- RELAY_TEST / DOOR_CONFIG_UPDATE / SYNC_TRIGGER / ALARM_ACK
    target         VARCHAR(100) NULL,             -- device_id / kartu / door
    detail         JSON NULL,                     -- {before:..., after:...}
    server_ts      DATETIME(3) NOT NULL,
    FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE SET NULL,
    INDEX idx_admlog_ts (server_ts),
    INDEX idx_admlog_aksi_ts (aksi, server_ts)
);

-- ═══════════════════════════════════════════
-- 7. ADMINS — RBAC minimal (§5.5)
-- ═══════════════════════════════════════════

ALTER TABLE admins
    MODIFY COLUMN role ENUM('admin','viewer') NOT NULL DEFAULT 'admin';

COMMIT;

-- ═══════════════════════════════════════════
-- ROLLBACK MANUAL (kalau perlu balik ke v0.2)
-- ═══════════════════════════════════════════
-- DROP TABLE IF EXISTS admin_logs, alarms, controller_events;
-- ALTER TABLE doors
--     DROP CONSTRAINT ck_door_held_ge_open, DROP CONSTRAINT ck_door_alarm_dur,
--     DROP CONSTRAINT ck_door_held_timeout, DROP CONSTRAINT ck_door_open_timeout,
--     DROP COLUMN alarm_duration_s, DROP COLUMN held_timeout_s,
--     DROP COLUMN open_timeout_s, DROP COLUMN is_active;
-- ALTER TABLE controllers
--     DROP COLUMN power_state, DROP COLUMN fire_state, DROP COLUMN tamper_state,
--     DROP COLUMN total_users_reported, DROP COLUMN free_heap, DROP COLUMN rssi,
--     DROP COLUMN uptime_s, DROP COLUMN fw_version, DROP COLUMN link_changed_at,
--     DROP COLUMN link_state, DROP COLUMN config_version, DROP COLUMN last_sync_error,
--     DROP COLUMN last_sync_at, DROP COLUMN sync_fail_count, DROP COLUMN sync_state;
-- ALTER TABLE access_logs
--     DROP INDEX idx_result_ts, DROP COLUMN device_ts,
--     DROP COLUMN device_id, DROP COLUMN door_number;
--     -- kartu TIDAK dikembalikan ke NOT NULL: baris alarm v0.3 punya kartu NULL.
-- ALTER TABLE admins MODIFY COLUMN role ENUM('admin') DEFAULT 'admin';
