-- ═══════════════════════════════════════════════════════════════
-- Access Control System — Database Schema v0.2
-- Generated from: docs/architecture_proposal_v0.2.md (Rev 3)
-- ═══════════════════════════════════════════════════════════════

-- Pastikan menggunakan database yang benar
-- CREATE DATABASE IF NOT EXISTS access_control
--   CHARACTER SET utf8mb4
--   COLLATE utf8mb4_general_ci;
-- USE access_control;

-- ═══════════════════════════════════════════
-- AUTH
-- ═══════════════════════════════════════════

CREATE TABLE admins (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    username    VARCHAR(50) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,           -- bcrypt hash
    role        ENUM('admin') DEFAULT 'admin',
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════
-- HARDWARE
-- ═══════════════════════════════════════════

CREATE TABLE controllers (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    device_id   VARCHAR(50) NOT NULL UNIQUE,     -- "ctrl-A", "ctrl-B"
    nama        VARCHAR(100),                     -- "Controller Gedung A"
    lokasi      VARCHAR(100),                     -- "Gedung A Lantai 1"
    wifi_ssid   VARCHAR(50),
    mqtt_broker VARCHAR(50),
    mqtt_port   INT DEFAULT 1883,
    mqtt_user   VARCHAR(50),                      -- username MQTT
    total_doors INT DEFAULT 4,
    heartbeat_s INT DEFAULT 30,
    ip_mode     ENUM('dhcp','static') DEFAULT 'dhcp',
    ip_address  VARCHAR(15),                      -- jika static
    web_port    INT DEFAULT 8081,                  -- port web server lokal
    last_seen   DATETIME,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE doors (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    controller_id   INT NOT NULL,
    door_number     INT NOT NULL,                 -- nomor pintu LOKAL (1-4)
    nama            VARCHAR(100),                  -- "Ruang Server", "Lobby"
    lokasi          VARCHAR(100),
    FOREIGN KEY (controller_id) REFERENCES controllers(id),
    UNIQUE KEY uk_ctrl_door (controller_id, door_number)
);

-- ═══════════════════════════════════════════
-- ORGANISASI
-- ═══════════════════════════════════════════

CREATE TABLE departments (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    nama        VARCHAR(100) NOT NULL UNIQUE,     -- "IT", "HRD", "Security"
    deskripsi   VARCHAR(255),
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE department_access (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    department_id   INT NOT NULL,
    door_id         INT NOT NULL,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
    FOREIGN KEY (door_id) REFERENCES doors(id) ON DELETE CASCADE,
    UNIQUE KEY uk_dept_door (department_id, door_id)
);

-- ═══════════════════════════════════════════
-- USER & AKSES
-- ═══════════════════════════════════════════

CREATE TABLE users (
    uid             INT AUTO_INCREMENT PRIMARY KEY,
    kartu           VARCHAR(20) NOT NULL UNIQUE,  -- collation: case-insensitive
    nama            VARCHAR(100) NOT NULL,
    department_id   INT DEFAULT NULL,
    is_custom_access BOOLEAN DEFAULT FALSE,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
);

CREATE TABLE user_access (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL,
    door_id     INT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(uid) ON DELETE CASCADE,
    FOREIGN KEY (door_id) REFERENCES doors(id) ON DELETE CASCADE,
    UNIQUE KEY uk_user_door (user_id, door_id)
);

-- ═══════════════════════════════════════════
-- LOG (IMMUTABLE — snapshot nama saat kejadian)
-- ═══════════════════════════════════════════

CREATE TABLE access_logs (
    id               BIGINT AUTO_INCREMENT PRIMARY KEY,
    kartu            VARCHAR(20) NOT NULL,
    user_id          INT NULL,
    user_nama        VARCHAR(100) NULL,            -- SNAPSHOT saat kejadian
    door_id          INT NULL,
    door_nama        VARCHAR(100) NULL,            -- SNAPSHOT saat kejadian
    controller_id    INT NULL,
    result           ENUM('GRANTED', 'DENIED') NOT NULL,
    reason           VARCHAR(50) NULL,             -- 'UNKNOWN_CARD', 'NO_ACCESS', 'OK'
    server_ts        DATETIME(3) NOT NULL,         -- otoritatif (UTC), dari Backend
    device_uptime_ms BIGINT NULL,                  -- untuk diagnosa
    is_replayed      BOOLEAN DEFAULT FALSE,        -- TRUE jika dari buffer offline
    created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(uid) ON DELETE SET NULL,
    FOREIGN KEY (door_id) REFERENCES doors(id) ON DELETE SET NULL,
    INDEX idx_ts (server_ts),
    INDEX idx_kartu_ts (kartu, server_ts),
    INDEX idx_ctrl_ts (controller_id, server_ts)
);
