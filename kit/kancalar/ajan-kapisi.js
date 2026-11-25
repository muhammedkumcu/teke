// Betik: PreToolUse (Agent | Task | Workflow)
// Amaç: alt-ajan modeli asla şansa kalmasın. Model yazılmamış ya da yasak modelle açılan ajanı reddeder.
const fs = require("fs");
const path = require("path");
const os = require("os");
const { girdiOku, projeKoku, ayarOku, reddet, guvenli, oku, m: metin } = require("./ortak");

function ajanTanimiModeli(kok, tur) {
  const klasorler = [path.join(kok, ".claude", "agents"), path.join(os.homedir(), ".claude", "agents")];
  for (const k of klasorler) {
    let dosyalar = [];
    try { dosyalar = fs.readdirSync(k, { recursive: true }).filter((f) => String(f).endsWith(".md")); } catch { continue; }
    for (const f of dosyalar) {
      const icerik = oku(path.join(k, String(f)));
      if (!icerik || !icerik.startsWith("---")) continue;
      const on = icerik.slice(3, icerik.indexOf("\n---", 3));
      const ad = ((on.match(/^name:\s*(.+)$/m) || [])[1] || "").trim().replace(/^["']|["']$/g, "");
      if (!ad || ad !== tur) continue;
      const model = (on.match(/^model:\s*(.+)$/m) || [])[1];
      return model ? model.trim().replace(/^["']|["']$/g, "") : "";
    }
  }
  return null; // tanım dosyası yok (yerleşik tür olabilir)
}

function yasakMi(model, yasaklar) {
  const m = String(model || "").toLowerCase();
  return yasaklar.find((y) => m.includes(String(y).toLowerCase()));
}

// İş akışı betiğindeki agent(...) çağrılarını bulur. Her çağrı için ham metni ve tırnak içleri boşaltılmış
// hâlini döndürür (istem metninde geçen "model" sözcüğü ya da parantez sayımı yanıltmasın diye).
function ajanCagrilari(betik) {
  const sonuc = [];
  const re = /(^|[^.\w$])agent\s*\(/g;
  let m;
  while ((m = re.exec(betik))) {
    const bas = m.index + m[1].length;
    let i = m.index + m[0].length;
    let derinlik = 1;
    let tirnak = null;
    let ciplak = "";
    for (; i < betik.length && derinlik > 0; i++) {
      const c = betik[i];
      if (tirnak) {
        if (c === "\\") i++;
        else if (c === tirnak) tirnak = null;
        continue;
      }
      if (c === '"' || c === "'" || c === "`") { tirnak = c; ciplak += '""'; continue; }
      if (c === "(") derinlik++;
      else if (c === ")") derinlik--;
      ciplak += c;
    }
    sonuc.push({ ham: betik.slice(bas, i), ciplak });
  }
  return sonuc;
}
// Çağrıda model var mı: seçeneklerde "model" anahtarı geçiyorsa ya da çağrıya verilen/yayılan bir değişkenin
// tanımında model yazıyorsa (const SECENEK = { model: "sonnet" }; agent(istem, { ...SECENEK })) evet.
function modelVar(cagri, betik) {
  if (/\bmodel\b/.test(cagri.ciplak)) return true;
  const adlar = [...cagri.ciplak.matchAll(/(?:\.\.\.|,\s*)([A-Za-z_$][\w$]*)\s*(?=[,})])/g)].map((x) => x[1]);
  return adlar.some((ad) => new RegExp(`\\b${ad.replace(/\$/g, "\\$")}\\s*=\\s*\\{[^}]*\\bmodel\\b`).test(betik));
}

// Çağrı bir rol tanımının adıyla yapılmışsa (agent(istem, { agentType: "denetci" })) modeli tanım dosyası verir.
// Dönüş: "var" (tanımda model yazılı ya da ad değişkenle verilmiş, görülemez: karışma) · "yok" · tanımdaki model adı.
function turdenModel(cagri, kok) {
  if (!/\bagentType\s*:/.test(cagri.ciplak)) return "yok";
  const m = cagri.ham.match(/\bagentType\s*:\s*(['"`])([^'"`$]+)\1/);
  if (!m) return "var";
  const t = ajanTanimiModeli(kok, m[2]);
  return t && t !== "inherit" ? t : "yok";
}

if (require.main === module) guvenli(async () => {
  const g = await girdiOku();
  const kok = projeKoku(g);
  const ayar = ayarOku(kok);
  const a = ayar.ajan;
  const girdi = g.tool_input || {};
  const roller = ayar.roller || {};
  const ipucu = metin("ajan.ipucu", "Tarama modeli: {isci}; yargı modeli: {hakem} (efor medium).", { isci: roller.ajanIsci || "sonnet", hakem: roller.ajanHakem || "opus" });

  if (g.tool_name === "Workflow") {
    let betik = girdi.script || "";
    if (!betik && girdi.scriptPath) betik = oku(girdi.scriptPath) || "";
    if (!betik) process.exit(0); // adlı/kayıtlı iş akışı: içeriği görülemez
    const cagrilar = ajanCagrilari(betik);
    if (cagrilar.length === 0) process.exit(0);
    if (a.modelZorunlu) {
      // Her agent() çağrısına ayrı ayrı bakılır: tek bir çağrıda model yazılı olması ötekileri kurtarmaz.
      const modelsiz = cagrilar.filter((c) => !modelVar(c, betik) && turdenModel(c, kok) === "yok");
      if (modelsiz.length) {
        reddet(metin("ajan.wf.modelsiz", "Workflow betiğindeki {toplam} agent() çağrısının {n} tanesinde model yok (ilki: {ilk}…). Modeli boş kalan yardımcı senin modelinle çalışır. Her agent() çağrısının seçeneklerine model yaz. {ipucu}", { toplam: cagrilar.length, n: modelsiz.length, ilk: modelsiz[0].ham.replace(/\s+/g, " ").slice(0, 70), ipucu }));
      }
    }
    for (const y of a.yasakModeller) {
      const d = new RegExp(`model\\s*:\\s*['"\`][^'"\`]*${String(y).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i");
      if (d.test(betik)) reddet(metin("ajan.wf.yasak", "Workflow betiğinde yasak ajan modeli var: \"{model}\". {ipucu} Bu yasağı yalnız kullanıcı kaldırır (.claude/teke/ayar.json → ajan.yasakModeller).", { model: y, ipucu }));
    }
    for (const c of cagrilar) {
      const y = yasakMi(turdenModel(c, kok), a.yasakModeller);
      if (y) reddet(metin("ajan.wf.rolyasak", "Workflow betiğinde adıyla çağrılan rol tanımının modeli yasak listede: \"{model}\". {ipucu}", { model: y, ipucu }));
    }
    process.exit(0);
  }

  // Agent / Task (başka araç ya da bozuk girdi: karışma)
  if (g.tool_name !== "Agent" && g.tool_name !== "Task") process.exit(0);
  const tur = girdi.subagent_type || "";
  if (tur === "fork" && a.forkYasak) {
    reddet(metin("ajan.fork", "\"fork\" ajanı ana oturumun modelini miras alır; bu projede yasak. Adlı bir ajan tanımı ya da açık model kullan. {ipucu}", { ipucu }));
  }
  let model = girdi.model;
  if (!model) {
    const tanimli = ajanTanimiModeli(kok, tur);
    if (tanimli && tanimli !== "inherit") model = tanimli;
    else if (a.modelZorunlu) {
      reddet(metin("ajan.modelsiz", "Ajan çağrısında model yazılmamış (tür: \"{tur}\"). Model boş kalırsa ajan ana oturumun modeliyle koşar. Çağrıya model ekle ya da modeli sabitlenmiş bir kit ajanı kullan (.claude/agents/). {ipucu}", { tur: tur || metin("ajan.varsayilan", "varsayılan"), ipucu }));
    }
  }
  const y = yasakMi(model, a.yasakModeller);
  if (y) {
    reddet(metin("ajan.yasak", "Alt-ajanda \"{model}\" modeli bu projede yasak (kullanıcı kararı). {ipucu} Yasağı yalnız kullanıcı kaldırır (.claude/teke/ayar.json → ajan.yasakModeller).", { model: y, ipucu }));
  }
  process.exit(0);
});
module.exports = { ajanCagrilari, modelVar, turdenModel };
