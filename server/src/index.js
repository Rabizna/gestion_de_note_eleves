// server/src/index.js
import { app } from "./app.js";
import { PORT as PORT_ENV, NODE_ENV } from "./env.js";
import { seedNiveaux } from "./seed/niveau.seed.js";
import { seedSections } from "./seed/section.seed.js";

const PORT = PORT_ENV || 4000;
console.log(`ENV: ${NODE_ENV} — démarrage serveur...`);

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`API prête sur http://0.0.0.0:${PORT}`);
});

// Arrêt propre
["SIGINT", "SIGTERM", "SIGUSR2"].forEach((sig) => {
  process.on(sig, () => {
    server.close(() => process.exit(0));
  });
});

// Seeds (optionnel)
Promise.allSettled([seedNiveaux(), seedSections()])
  .then((r) => {
    const msgs = r.map((x, i) => `${i}:${x.status}`).join(", ");
    console.log("Seeds:", msgs);
  })
  .catch((e) => console.error("Seed error:", e));
