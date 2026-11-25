// Betik: PostToolUse (araç çağrılarından sonra)
// Amaç: uzun bir iş sürerken de doluluk görülsün. Tek mesajla saatlerce çalışan bir oturum, mesaj gelmediği için
// eşiği başka türlü hiç duymaz. En çok iki dakikada bir ölçer; YALNIZ eşik aşıldığında tek satır ekler.
const fs = require("fs");
const path = require("path");
const { girdiOku, projeKoku, ayarOku, baglamEkle, guvenli, durumOku, durumYaz, baglamOlc, baglamHaberi } = require("./ortak");

const ARALIK_MS = 120000;

guvenli(async () => {
  const g = await girdiOku();
  if (!g.session_id || !g.transcript_path || g.agent_id) process.exit(0); // alt-ajan çağrılarında ölçme
  const kok = projeKoku(g);
  if (!fs.existsSync(path.join(kok, ".claude", "teke", "ayar.json"))) process.exit(0);
  const d = durumOku(kok, g.session_id);
  if (d.sonOlcum && Date.now() - d.sonOlcum < ARALIK_MS) process.exit(0);
  const ayar = ayarOku(kok);
  const haber = baglamHaberi(ayar, d, baglamOlc(g.transcript_path, ayar), d.rol || "orkestrator");
  d.sonOlcum = Date.now();
  durumYaz(kok, g.session_id, d);
  if (haber) baglamEkle("PostToolUse", haber);
  process.exit(0);
});
