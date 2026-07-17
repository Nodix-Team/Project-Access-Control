-- ═══════════════════════════════════════════════════════════════
-- Access Control System — Seed Data (Development Only)
-- Jalankan setelah schema.sql
-- ═══════════════════════════════════════════════════════════════

-- Admin (password: admin123 — bcrypt hash)
INSERT INTO admins (username, password, role) VALUES
('admin', '$2b$12$HeO1rUc6yS0xyImfGh60mukBqg8pngtcKXVijOHvwhSaZllcg9f6u', 'admin');

-- Controllers
INSERT INTO controllers (device_id, nama, lokasi, wifi_ssid, mqtt_broker, mqtt_user, total_doors) VALUES
('ctrl-A', 'Controller Gedung A', 'Gedung A Lantai 1', 'OFFICE_WIFI', '192.168.1.100', 'ctrl-A', 4),
('ctrl-B', 'Controller Gedung B', 'Gedung B Lantai 1', 'OFFICE_WIFI', '192.168.1.100', 'ctrl-B', 4);

-- Doors (penomoran LOKAL per controller)
INSERT INTO doors (controller_id, door_number, nama, lokasi) VALUES
(1, 1, 'Lobby Utama',    'Gedung A - Lantai 1'),
(1, 2, 'Ruang Server',   'Gedung A - Lantai 1'),
(1, 3, 'Ruang Meeting',  'Gedung A - Lantai 2'),
(1, 4, 'Ruang Arsip',    'Gedung A - Lantai 2'),
(2, 1, 'Lobby B',        'Gedung B - Lantai 1'),
(2, 2, 'Lab Komputer',   'Gedung B - Lantai 1'),
(2, 3, 'Ruang Workshop', 'Gedung B - Lantai 2'),
(2, 4, 'Gudang',         'Gedung B - Lantai 2');

-- Departments
INSERT INTO departments (nama, deskripsi) VALUES
('IT',       'Divisi Teknologi Informasi'),
('HRD',      'Human Resource Development'),
('Security', 'Tim Keamanan');

-- Department Access (default akses per department)
INSERT INTO department_access (department_id, door_id) VALUES
-- IT: Lobby Utama, Ruang Server, Lab Komputer
(1, 1), (1, 2), (1, 6),
-- HRD: Lobby Utama, Ruang Meeting
(2, 1), (2, 3),
-- Security: semua pintu Gedung A
(3, 1), (3, 2), (3, 3), (3, 4);

-- Users
INSERT INTO users (kartu, nama, department_id, is_custom_access) VALUES
('AABBCCDD', 'John Doe',     1, FALSE),   -- IT, ikut dept
('0011223344', 'Jane Smith', 1, TRUE),     -- IT, custom override
('DEADBEEF', 'Bob Wilson',   2, FALSE),    -- HRD, ikut dept
('FF001122', 'Alice Brown',  NULL, TRUE),  -- tanpa dept, custom
('CAFEBABE', 'Charlie Lee',  3, FALSE);    -- Security, ikut dept

-- Custom Access (hanya untuk user dengan is_custom_access = TRUE)
INSERT INTO user_access (user_id, door_id) VALUES
-- Jane Smith: Lobby, Server, Meeting, Lab Komputer (lebih banyak dari dept IT)
(2, 1), (2, 2), (2, 3), (2, 6),
-- Alice Brown: hanya Lobby B
(4, 5);
