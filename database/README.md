# Database — MySQL

## Setup

1. Install MySQL 8.0+
2. Buat database:
   ```sql
   CREATE DATABASE access_control CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
   ```
3. Jalankan schema:
   ```bash
   mysql -u root -p access_control < schema.sql
   ```
4. (Opsional) Isi data dummy:
   ```bash
   mysql -u root -p access_control < seed.sql
   ```

## File
- `schema.sql` — DDL untuk semua 8 tabel
- `seed.sql` — Data dummy untuk development
- `migrations/` — Perubahan schema ke depan
