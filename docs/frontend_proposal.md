# Proposal Frontend – Sprint 5

## Ringkasan
Frontend dibangun dengan React 18 + Vite sesuai `frontend/README.md`, dengan keputusan konkret pada 3 poin yang masih **TBD**: styling, state management, dan WebSocket. Keputusan ini didasarkan pada arsitektur backend yang sudah selesai (FastAPI + MySQL + EMQX/MQTT) dari sprint 1-4, bukan preferensi sepihak.

## Tech Stack Final

| Layer | Pilihan | Kenapa (vs opsi lain di README) |
|---|---|---|
| Framework | React 18 + Vite | Sudah ditetapkan di README, tidak berubah. |
| Bahasa | TypeScript | Tidak disebut di README, tapi krusial: entity (User, Door, Controller, Log) harus sinkron ketat dengan schema MySQL (8 tabel) dan response FastAPI – TS mencegah bug integrasi saat sprint 5 mulai konsumsi API asli. |
| Styling | **Tailwind CSS** (bukan CSS biasa) | UI ini dense-table dan status-badge heavy (granted/denied, online/offline). Tailwind mempercepat konsistensi varian warna/spacing lintas 7 halaman tanpa file CSS terpisah per komponen. CSS murni lebih fleksibel tapi rawan berantakan begitu lebih dari 1 kontributor frontend (README mencatat 2 kontributor: @danskiv, @rizzalaulia). |
| Server state | **TanStack Query (React Query)** | Semua data (users, departments, controllers, logs) datang dari REST FastAPI. React Query memberi caching, retry, dan invalidation otomatis setelah aksi tulis (add user, toggle akses pintu) – mengurangi state management manual. |
| Client/UI state | **Zustand** | Untuk state lokal murni UI: filter aktif, tab detail user, view yang dipilih, modal terbuka. Tidak dipakai untuk data server – menghindari duplikasi dengan React Query. Kedua ini dipakai bersamaan, bukan salah satu. |
| Realtime | **Native WebSocket** (bukan socket.io) | Broker sudah EMQX (MQTT), bukan Socket.IO server. Backend FastAPI cukup mem-bridge event MQTT ke satu WebSocket endpoint native; menambah socket.io berarti protokol tambahan yang tidak dibutuhkan dan menambah dependency tanpa manfaat karena tidak ada fitur socket.io (rooms, fallback transport) yang relevan di sini. |
| Routing | React Router v6 | Route per halaman: `/login`, `/dashboard`, `/users`, `/users/:id`, `/departments`, `/controllers`, `/doors`, `/logs`. |

## Alasan Menyimpang dari "TBD" di README
README sengaja menandai styling/state/WebSocket sebagai TBD (belum diputuskan) – proposal ini mengisi keputusan tersebut berdasarkan constraint yang sudah nyata dari backend/DB/firmware selesai, bukan mengganti keputusan yang sudah final (React+Vite tetap dipakai apa adanya).

## Struktur Direktori (usulan)
```
frontend/
  src/
    api/          # axios/fetch client + React Query hooks per resource
    ws/           # native WebSocket client + event dispatcher
    store/        # Zustand stores (ui state)
    components/   # Table, Badge, Modal, NavSidebar, StatCard
    pages/
      Login/
      Dashboard/
      Users/ (List + Detail)
      Departments/
      Controllers/
      Doors/
      Logs/
    types/        # TS types mirroring MySQL schema (8 tabel)
```

## Referensi Visual
Mockup interaktif sudah dibuat mencakup 7 halaman di atas (dark ops console, live-feed animasi, filter/search, modal add user) – dipakai sebagai acuan struktur komponen dan state per halaman saat implementasi React dimulai.

## Next Steps Sprint 5
1. Scaffold Vite + TS + Tailwind + React Query + Zustand + React Router.
2. Implement `api/` client sesuai endpoint FastAPI aktual (butuh kontrak endpoint dari backend).
3. Implement WebSocket client sesuai endpoint bridge MQTT–WS dari backend.
4. Bangun halaman satu per satu mulai dari Login → Dashboard → Users.
