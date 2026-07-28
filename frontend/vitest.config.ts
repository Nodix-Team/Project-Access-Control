// Konfigurasi vitest untuk frontend-ci.yml (Sprint 1 CI/CD, KEPUTUSAN §7.1 W2).
//
// Sprint 1 fokus ke UNIT TEST fungsi murni (utils/) — tidak butuh jsdom/DOM env. Kalau nanti
// ada test level komponen React (Sprint 5), tambahkan `environment: "jsdom"` + @testing-library.
// Sengaja dibiarkan "node" dulu supaya ringan & cepat.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.{test,spec}.ts"],
    globals: false,
  },
});
